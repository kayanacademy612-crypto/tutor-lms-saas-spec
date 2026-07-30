package handlers

import (
        "bytes"
        "context"
        "encoding/json"
        "fmt"
        "io"
        "net/http"
        "os"
        "strings"
        "time"

        "lastsaas/internal/db"
        "lastsaas/internal/events"
        "lastsaas/internal/models"

        "github.com/gorilla/mux"
        "go.mongodb.org/mongo-driver/bson"
        "go.mongodb.org/mongo-driver/bson/primitive"
        "go.mongodb.org/mongo-driver/mongo"
        "go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// AIHandler — Phase 6 TutorAI endpoints (OpenAI passthrough)
//
// Mounted under /api/lms/ai/*:
//
//   POST /api/lms/ai/chat                       — send a chat message
//   GET  /api/lms/ai/conversations              — list user's conversations
//   GET  /api/lms/ai/conversations/{id}         — get conversation + messages
//   DELETE /api/lms/ai/conversations/{id}       — delete conversation + messages
//   GET  /api/lms/ai/usage                      — daily per-user usage stats
//   POST /api/lms/ai/generate-course-outline    — JSON course outline generator
//   POST /api/lms/ai/generate-quiz              — JSON quiz generator
//
// All tenant-scoped queries filter by tenantId. The Chat / List / Usage
// endpoints additionally scope by userId so users only see their own
// conversations / usage. The OpenAI API is called directly via net/http
// (no third-party SDK dependency) so the build does not require
// github.com/sashabaranov/go-openai.
//
// Configuration:
//   - OPENAI_API_KEY  (required for AI calls; otherwise handlers return 503)
//   - OPENAI_MODEL    (optional; defaults to "gpt-4")
//   - OPENAI_ENDPOINT (optional; defaults to the public Chat Completions URL)
//
// The handler reuses getLMSContext (defined in lms.go) for tenant/user
// resolution and emits the Phase 6 TutorAI event constants declared in
// reportsai_events.go:
//   - EventAIConversationCreated
//   - EventAIMessageSent
//   - EventAIResponseReceived
//   - EventAIUsageLimitReached
//
// Daily per-user quota: aiDailyTokenLimit tokens/day. When the rolling
// AIUsageStats.TotalTokens for today would push the user past the limit,
// the Chat handler emits EventAIUsageLimitReached and returns 429.
// ---------------------------------------------------------------------------

// AIHandler implements the Phase 6 TutorAI REST API surface mounted at
// /api/lms/ai/*.
type AIHandler struct {
        db      *db.MongoDB
        emitter events.Emitter
}

// NewAIHandler constructs an AIHandler bound to the given MongoDB connection
// and event emitter.
func NewAIHandler(database *db.MongoDB, emitter events.Emitter) *AIHandler {
        return &AIHandler{db: database, emitter: emitter}
}

// Tunable constants for the AI handler. The daily token limit is per-user
// (AIUsageStats is keyed on (tenantId, userId, date)); the e.g. in the spec
// maps cleanly onto this row shape.
const (
        aiOpenAIEndpoint      = "https://api.openai.com/v1/chat/completions"
        aiDefaultModel        = "gpt-4"
        aiDefaultMaxTokens    = 1024
        aiDefaultTemperature  = 0.7
        aiHistoryLimit        = 10 // last N messages of conversation history
        aiDailyTokenLimit     = 100000
        aiRequestTimeout      = 60 * time.Second
        aiTitleMaxLen         = 50
        aiDefaultLessonsCount = 10
        aiMaxLessonsCount     = 50
        aiDefaultQuestionCnt  = 5
        aiMaxQuestionCnt      = 30
)

// --- OpenAI wire types (subset of the official Chat Completions API) ---

// openAIMessage mirrors the {role, content} object in the OpenAI Chat
// Completions request and response bodies.
type openAIMessage struct {
        Role    string `json:"role"`
        Content string `json:"content"`
}

// openAIRequest is the outbound request body for POST /v1/chat/completions.
type openAIRequest struct {
        Model       string          `json:"model"`
        Messages    []openAIMessage `json:"messages"`
        MaxTokens   int             `json:"max_tokens,omitempty"`
        Temperature float64         `json:"temperature,omitempty"`
}

// openAIUsage reports token consumption for a single completion.
type openAIUsage struct {
        PromptTokens     int `json:"prompt_tokens"`
        CompletionTokens int `json:"completion_tokens"`
        TotalTokens      int `json:"total_tokens"`
}

// openAIResponse is the inbound response body. Only the fields the AIHandler
// consumes are decoded; the rest are ignored.
type openAIResponse struct {
        ID      string `json:"id"`
        Choices []struct {
                Index        int           `json:"index"`
                Message      openAIMessage `json:"message"`
                FinishReason string        `json:"finish_reason"`
        } `json:"choices"`
        Usage openAIUsage `json:"usage"`
}

// openAIErrorBody is the error envelope returned by the OpenAI API.
type openAIErrorBody struct {
        Error struct {
                Message string `json:"message"`
                Type    string `json:"type"`
                Code    string `json:"code"`
        } `json:"error"`
}

// --- Public request / response DTOs ---

// chatRequest is the inbound body for POST /api/lms/ai/chat.
type chatRequest struct {
        ConversationID string                 `json:"conversationId,omitempty"`
        Message        string                 `json:"message"`
        Context        map[string]interface{} `json:"context,omitempty"`
}

// chatUsage reports per-request + daily-rolling token accounting.
type chatUsage struct {
        TokensUsed      int `json:"tokensUsed"`
        RemainingTokens int `json:"remainingTokens"`
}

// chatResponse is the outbound body for POST /api/lms/ai/chat.
type chatResponse struct {
        ConversationID string         `json:"conversationId"`
        Message        models.AIMessage `json:"message"`
        Usage          chatUsage      `json:"usage"`
}

// courseOutlineRequest is the inbound body for POST /api/lms/ai/generate-course-outline.
type courseOutlineRequest struct {
        Topic        string `json:"topic"`
        Level        string `json:"level,omitempty"`        // beginner|intermediate|advanced
        LessonsCount int    `json:"lessonsCount,omitempty"`
}

// courseOutlineLesson is one row in the generated outline.
type courseOutlineLesson struct {
        Title   string `json:"title"`
        Summary string `json:"summary"`
}

// courseOutline is the generated outline payload.
type courseOutline struct {
        Title       string               `json:"title"`
        Description string               `json:"description"`
        Lessons     []courseOutlineLesson `json:"lessons"`
}

// courseOutlineResponse is the outbound body for the outline endpoint.
type courseOutlineResponse struct {
        Outline courseOutline `json:"outline"`
}

// quizRequest is the inbound body for POST /api/lms/ai/generate-quiz.
type quizRequest struct {
        LessonID      string   `json:"lessonId,omitempty"`
        Topic         string   `json:"topic"`
        QuestionCount int      `json:"questionCount,omitempty"`
        QuestionTypes []string `json:"questionTypes,omitempty"`
}

// quizQuestion is one generated question.
type quizQuestion struct {
        Type          string   `json:"type"`
        Question      string   `json:"question"`
        Options       []string `json:"options,omitempty"`
        CorrectAnswer string   `json:"correctAnswer"`
        Explanation   string   `json:"explanation,omitempty"`
}

// quizPayload is the generated quiz payload.
type quizPayload struct {
        Questions []quizQuestion `json:"questions"`
}

// quizResponse is the outbound body for the quiz endpoint.
type quizResponse struct {
        Quiz quizPayload `json:"quiz"`
}

// ===========================================================================
// Shared helpers
// ===========================================================================

// requireContext resolves the per-request tenant/user context. Returns false
// (after writing a 400/401 response) when the request lacks a usable tenant
// or authenticated user.
func (h *AIHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
        ctx, ok := getLMSContext(r)
        if !ok {
                respondWithError(w, http.StatusBadRequest, "Tenant context required")
                return lmsContext{}, false
        }
        if ctx.UserID.IsZero() {
                respondWithError(w, http.StatusUnauthorized, "Authentication required")
                return lmsContext{}, false
        }
        return ctx, true
}

// getOpenAIKey returns the OpenAI API key from the OPENAI_API_KEY env var.
// Returns the empty string when unset; callers MUST check and return 503.
func getOpenAIKey() string {
        return strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
}

// getOpenAIModel returns the configured model, falling back to gpt-4 when
// the OPENAI_MODEL env var is unset or empty.
func getOpenAIModel() string {
        if m := strings.TrimSpace(os.Getenv("OPENAI_MODEL")); m != "" {
                return m
        }
        return aiDefaultModel
}

// getOpenAIEndpoint returns the configured endpoint, falling back to the
// public OpenAI Chat Completions URL.
func getOpenAIEndpoint() string {
        if e := strings.TrimSpace(os.Getenv("OPENAI_ENDPOINT")); e != "" {
                return e
        }
        return aiOpenAIEndpoint
}

// requireOpenAIKey writes a 503 response when OPENAI_API_KEY is unset. The
// handler then returns false so the caller can bail out. The error message
// is intentionally actionable so an operator can fix the config without
// reading server logs.
func requireOpenAIKey(w http.ResponseWriter) bool {
        if getOpenAIKey() == "" {
                respondWithError(w, http.StatusServiceUnavailable,
                        "AI service not configured. Set OPENAI_API_KEY environment variable.")
                return false
        }
        return true
}

// callOpenAI posts a Chat Completions request to the OpenAI API and returns
// the assistant's message content plus the total tokens consumed. Network /
// API errors are returned with a descriptive message so the handler can map
// them to a 502/429. The caller controls the request timeout via the
// supplied context.
func callOpenAI(ctx context.Context, model string, messages []openAIMessage, maxTokens int, temperature float64) (string, int, error) {
        key := getOpenAIKey()
        if key == "" {
                return "", 0, fmt.Errorf("OPENAI_API_KEY not set")
        }
        if maxTokens <= 0 {
                maxTokens = aiDefaultMaxTokens
        }
        if temperature == 0 {
                temperature = aiDefaultTemperature
        }

        body := openAIRequest{
                Model:       model,
                Messages:    messages,
                MaxTokens:   maxTokens,
                Temperature: temperature,
        }
        rawBody, err := json.Marshal(body)
        if err != nil {
                return "", 0, fmt.Errorf("failed to marshal OpenAI request: %w", err)
        }

        req, err := http.NewRequestWithContext(ctx, http.MethodPost, getOpenAIEndpoint(), bytes.NewReader(rawBody))
        if err != nil {
                return "", 0, fmt.Errorf("failed to build OpenAI request: %w", err)
        }
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("Authorization", "Bearer "+key)

        resp, err := http.DefaultClient.Do(req)
        if err != nil {
                return "", 0, fmt.Errorf("OpenAI request failed: %w", err)
        }
        defer resp.Body.Close()

        respBytes, err := io.ReadAll(resp.Body)
        if err != nil {
                return "", 0, fmt.Errorf("failed to read OpenAI response: %w", err)
        }

        if resp.StatusCode != http.StatusOK {
                // Try to surface the upstream error message verbatim; fall back to
                // a generic upstream-failure message when the body isn't JSON.
                var errBody openAIErrorBody
                if json.Unmarshal(respBytes, &errBody) == nil && errBody.Error.Message != "" {
                        return "", 0, fmt.Errorf("OpenAI API error (status %d): %s", resp.StatusCode, errBody.Error.Message)
                }
                return "", 0, fmt.Errorf("OpenAI API returned status %d", resp.StatusCode)
        }

        var parsed openAIResponse
        if err := json.Unmarshal(respBytes, &parsed); err != nil {
                return "", 0, fmt.Errorf("failed to decode OpenAI response: %w", err)
        }
        if len(parsed.Choices) == 0 {
                return "", parsed.Usage.TotalTokens, fmt.Errorf("OpenAI returned no choices")
        }

        content := strings.TrimSpace(parsed.Choices[0].Message.Content)
        tokensUsed := parsed.Usage.TotalTokens
        if tokensUsed == 0 {
                // Fallback: approximate with prompt + completion tokens if total
                // was omitted by the upstream API.
                tokensUsed = parsed.Usage.PromptTokens + parsed.Usage.CompletionTokens
        }
        return content, tokensUsed, nil
}

// buildSystemPrompt returns the system prompt for the chat request. When
// context.action is set, a specialised prompt is returned; otherwise the
// default TutorAI prompt is used.
func buildSystemPrompt(ctx map[string]interface{}) string {
        if ctx == nil {
                return "You are TutorAI, an AI assistant for an LMS. Help the user with course creation, quiz generation, and educational content. Be concise, accurate, and pedagogically sound."
        }
        action, _ := ctx["action"].(string)
        switch action {
        case "content_assist":
                return "You are TutorAI, an AI content assistant for an LMS. Help the user improve their course content. Provide clear, actionable suggestions. Preserve the user's voice and tone."
        case "course_outline":
                return "You are TutorAI, an AI course design assistant for an LMS. Help the user design course outlines. Always return JSON in the exact shape requested."
        case "quiz_generation":
                return "You are TutorAI, an AI quiz generation assistant for an LMS. Generate fair, unambiguous questions tied to the supplied topic. Always return JSON in the exact shape requested."
        case "tutor":
                return "You are TutorAI, an AI tutor for an LMS. Help the student understand the material by asking guiding questions and explaining concepts at the student's level. Do not just give answers — teach."
        default:
                return "You are TutorAI, an AI assistant for an LMS. Help the user with course creation, quiz generation, and educational content. Be concise, accurate, and pedagogically sound."
        }
}

// truncateTitle produces a <=max-byte title from a free-form message. It
// trims whitespace, slices on rune boundaries, and appends an ellipsis when
// the input exceeds the limit.
func truncateTitle(s string, max int) string {
        s = strings.TrimSpace(s)
        if s == "" {
                return "New conversation"
        }
        runes := []rune(s)
        if len(runes) <= max {
                return s
        }
        return string(runes[:max]) + "…"
}

// normalizeToDate truncates a time.Time to midnight UTC so it can be used
// as the per-day partition key in AIUsageStats.
func normalizeToDate(t time.Time) time.Time {
        return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// getTodayUsage returns the user's AIUsageStats row for today (UTC midnight),
// or a zero-valued row when none exists yet. The caller is expected to
// upsert after incrementing counters.
func (h *AIHandler) getTodayUsage(ctx context.Context, tenantID, userID primitive.ObjectID) (models.AIUsageStats, error) {
        today := normalizeToDate(time.Now())
        var stats models.AIUsageStats
        err := h.db.AIUsageStats().FindOne(ctx, bson.M{
                "tenantId": tenantID,
                "userId":   userID,
                "date":     today,
        }).Decode(&stats)
        if err == mongo.ErrNoDocuments {
                return models.AIUsageStats{
                        TenantID: tenantID,
                        UserID:   userID,
                        Date:     today,
                }, nil
        }
        if err != nil {
                return models.AIUsageStats{}, err
        }
        return stats, nil
}

// incrementDailyUsage upserts the user's AIUsageStats row for the supplied
// date, atomically incrementing TotalRequests and TotalTokens. The unique
// compound index on (tenantId, userId, date) makes the upsert idempotent.
func (h *AIHandler) incrementDailyUsage(ctx context.Context, tenantID, userID primitive.ObjectID, date time.Time, requests, tokens int) error {
        filter := bson.M{
                "tenantId": tenantID,
                "userId":   userID,
                "date":     date,
        }
        update := bson.M{
                "$inc": bson.M{
                        "totalRequests": requests,
                        "totalTokens":   tokens,
                },
                "$setOnInsert": bson.M{
                        "createdAt": time.Now(),
                },
                "$set": bson.M{
                        "updatedAt": time.Now(),
                },
        }
        opts := options.Update().SetUpsert(true)
        _, err := h.db.AIUsageStats().UpdateOne(ctx, filter, update, opts)
        return err
}

// getConversationHistory returns the last `limit` AIMessage records for the
// supplied conversation, sorted oldest→newest so they can be appended to
// the OpenAI request in chronological order.
func (h *AIHandler) getConversationHistory(ctx context.Context, tenantID, conversationID primitive.ObjectID, limit int) ([]models.AIMessage, error) {
        if limit <= 0 {
                limit = aiHistoryLimit
        }
        // Fetch the most recent `limit` messages in descending order, then
        // reverse so the slice is oldest→newest for the OpenAI request.
        opts := options.Find().
                SetLimit(int64(limit)).
                SetSort(bson.D{{Key: "createdAt", Value: -1}}).
                SetProjection(bson.M{"role": 1, "content": 1})
        cursor, err := h.db.AIMessages().Find(ctx, bson.M{
                "tenantId":       tenantID,
                "conversationId": conversationID,
        }, opts)
        if err != nil {
                return nil, err
        }
        defer cursor.Close(ctx)

        var msgs []models.AIMessage
        if err := cursor.All(ctx, &msgs); err != nil {
                return nil, err
        }
        // Reverse to oldest→newest.
        for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
                msgs[i], msgs[j] = msgs[j], msgs[i]
        }
        return msgs, nil
}

// extractJSON strips a leading ```json (or ```) code fence and trailing ```
// from the supplied string. OpenAI frequently wraps JSON output in markdown
// code fences even when explicitly asked not to; this normaliser makes the
// downstream json.Unmarshal reliable.
func extractJSON(s string) string {
        s = strings.TrimSpace(s)
        // Strip leading fence.
        if strings.HasPrefix(s, "```json") {
                s = strings.TrimPrefix(s, "```json")
        } else if strings.HasPrefix(s, "```") {
                s = strings.TrimPrefix(s, "```")
        }
        // Strip trailing fence.
        s = strings.TrimSuffix(s, "```")
        s = strings.TrimSpace(s)
        return s
}

// ===========================================================================
// POST /api/lms/ai/chat
// ===========================================================================

// Chat handles POST /api/lms/ai/chat.
//
// Flow:
//  1. Parse request: conversationId (optional), message, context (optional).
//  2. If no conversationId: create a new AIConversation titled with the
//     first 50 chars of the message. Emit EventAIConversationCreated.
//  3. Save the user's AIMessage (role=user). Emit EventAIMessageSent.
//  4. Build the OpenAI request: system prompt (action-aware), last 10
//     messages of history, and the user's new message.
//  5. Call the OpenAI Chat Completions API via net/http.
//  6. Save the assistant's response as an AIMessage (role=assistant). Emit
//     EventAIResponseReceived.
//  7. Update the conversation's UsageTokens running total.
//  8. Upsert AIUsageStats for today (increment totalRequests, totalTokens).
//  9. Check daily per-user token quota; if exceeded, emit
//     EventAIUsageLimitReached and return 429.
// 10. Return { conversationId, message: AIMessage, usage: { tokensUsed, remainingTokens } }.
//
// If OPENAI_API_KEY is unset, the handler returns 503 with a helpful message
// rather than crashing.
func (h *AIHandler) Chat(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireContext(w, r)
        if !ok {
                return
        }
        if !requireOpenAIKey(w) {
                return
        }

        var req chatRequest
        if err := decodeJSON(r, &req); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
                return
        }
        req.Message = strings.TrimSpace(req.Message)
        if req.Message == "" {
                respondWithError(w, http.StatusBadRequest, "Message is required")
                return
        }

        now := time.Now()
        reqCtx := r.Context()

        // --- Pre-flight: check daily quota BEFORE calling OpenAI so a user
        // already at the cap doesn't burn another upstream token. ---
        todayUsage, err := h.getTodayUsage(reqCtx, ctx.TenantID, ctx.UserID)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load usage stats")
                return
        }
        if todayUsage.TotalTokens >= aiDailyTokenLimit {
                h.emitter.Emit(events.Event{
                        Type:      events.EventAIUsageLimitReached,
                        Timestamp: now,
                        Data: map[string]interface{}{
                                "tenantId":      ctx.TenantID.Hex(),
                                "userId":        ctx.UserID.Hex(),
                                "usedTokens":    todayUsage.TotalTokens,
                                "limitTokens":   aiDailyTokenLimit,
                                "endpoint":      "chat",
                        },
                })
                respondWithError(w, http.StatusTooManyRequests,
                        fmt.Sprintf("Daily AI usage limit reached (%d tokens). Try again tomorrow.", aiDailyTokenLimit))
                return
        }

        // --- Resolve or create the conversation. ---
        var conversationID primitive.ObjectID
        var isNew bool
        if req.ConversationID != "" {
                oid, err := primitive.ObjectIDFromHex(req.ConversationID)
                if err != nil {
                        respondWithError(w, http.StatusBadRequest, "Invalid conversationId")
                        return
                }
                // Verify the conversation exists and belongs to this tenant + user.
                var conv models.AIConversation
                if err := h.db.AIConversations().FindOne(reqCtx, bson.M{
                        "tenantId": ctx.TenantID,
                        "_id":      oid,
                        "userId":   ctx.UserID,
                }).Decode(&conv); err != nil {
                        if err == mongo.ErrNoDocuments {
                                respondWithError(w, http.StatusNotFound, "Conversation not found")
                                return
                        }
                        respondWithError(w, http.StatusInternalServerError, "Failed to load conversation")
                        return
                }
                conversationID = oid
        } else {
                conversationID = primitive.NewObjectID()
                isNew = true
                conv := models.AIConversation{
                        ID:          conversationID,
                        TenantID:    ctx.TenantID,
                        UserID:      ctx.UserID,
                        Title:       truncateTitle(req.Message, aiTitleMaxLen),
                        Context:     req.Context,
                        UsageTokens: 0,
                        CreatedAt:   now,
                        UpdatedAt:   now,
                }
                if _, err := h.db.AIConversations().InsertOne(reqCtx, conv); err != nil {
                        respondWithError(w, http.StatusInternalServerError, "Failed to create conversation")
                        return
                }
                h.emitter.Emit(events.Event{
                        Type:      events.EventAIConversationCreated,
                        Timestamp: now,
                        Data: map[string]interface{}{
                                "tenantId":       ctx.TenantID.Hex(),
                                "userId":         ctx.UserID.Hex(),
                                "conversationId": conversationID.Hex(),
                                "title":          conv.Title,
                        },
                })
        }

        // --- Persist the user's message. ---
        userMsg := models.AIMessage{
                ID:             primitive.NewObjectID(),
                TenantID:       ctx.TenantID,
                ConversationID: conversationID,
                Role:           models.AIMessageRoleUser,
                Content:        req.Message,
                Model:          "",
                CreatedAt:      now,
        }
        if _, err := h.db.AIMessages().InsertOne(reqCtx, userMsg); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to save user message")
                return
        }
        h.emitter.Emit(events.Event{
                Type:      events.EventAIMessageSent,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":       ctx.TenantID.Hex(),
                        "userId":         ctx.UserID.Hex(),
                        "conversationId": conversationID.Hex(),
                        "messageId":      userMsg.ID.Hex(),
                        "role":           string(models.AIMessageRoleUser),
                },
        })

        // --- Build the OpenAI request. ---
        history, err := h.getConversationHistory(reqCtx, ctx.TenantID, conversationID, aiHistoryLimit)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load conversation history")
                return
        }
        openAIMsgs := make([]openAIMessage, 0, len(history)+2)
        openAIMsgs = append(openAIMsgs, openAIMessage{
                Role:    "system",
                Content: buildSystemPrompt(req.Context),
        })
        for _, m := range history {
                // Skip the just-inserted user message so we don't duplicate it; the
                // next append adds the canonical copy at the end of the slice.
                if m.ID == userMsg.ID {
                        continue
                }
                openAIMsgs = append(openAIMsgs, openAIMessage{
                        Role:    string(m.Role),
                        Content: m.Content,
                })
        }
        openAIMsgs = append(openAIMsgs, openAIMessage{
                Role:    string(models.AIMessageRoleUser),
                Content: req.Message,
        })

        // --- Call OpenAI. ---
        callCtx, cancel := context.WithTimeout(reqCtx, aiRequestTimeout)
        defer cancel()
        content, tokensUsed, err := callOpenAI(callCtx, getOpenAIModel(), openAIMsgs, aiDefaultMaxTokens, aiDefaultTemperature)
        if err != nil {
                respondWithError(w, http.StatusBadGateway, "OpenAI request failed: "+err.Error())
                return
        }
        if tokensUsed <= 0 {
                // Always attribute at least 1 token so the metering job can count
                // the request even when the upstream API omits usage data.
                tokensUsed = 1
        }

        // --- Persist the assistant's message. ---
        respTime := time.Now()
        assistantMsg := models.AIMessage{
                ID:             primitive.NewObjectID(),
                TenantID:       ctx.TenantID,
                ConversationID: conversationID,
                Role:           models.AIMessageRoleAssistant,
                Content:        content,
                TokensUsed:     tokensUsed,
                Model:          getOpenAIModel(),
                CreatedAt:      respTime,
        }
        if _, err := h.db.AIMessages().InsertOne(reqCtx, assistantMsg); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to save assistant message")
                return
        }
        h.emitter.Emit(events.Event{
                Type:      events.EventAIResponseReceived,
                Timestamp: respTime,
                Data: map[string]interface{}{
                        "tenantId":       ctx.TenantID.Hex(),
                        "userId":         ctx.UserID.Hex(),
                        "conversationId": conversationID.Hex(),
                        "messageId":      assistantMsg.ID.Hex(),
                        "tokensUsed":     tokensUsed,
                        "model":          assistantMsg.Model,
                },
        })

        // --- Update the conversation's running token total. ---
        if _, err := h.db.AIConversations().UpdateByID(reqCtx, conversationID, bson.M{
                "$inc": bson.M{"usageTokens": tokensUsed},
                "$set": bson.M{"updatedAt": respTime},
        }); err != nil {
                // Non-fatal: the assistant message was already saved, so the chat
                // response can still be returned. Log via the event stream only.
                h.emitter.Emit(events.Event{
                        Type:      events.EventAIResponseReceived,
                        Timestamp: respTime,
                        Data: map[string]interface{}{
                                "tenantId":       ctx.TenantID.Hex(),
                                "conversationId": conversationID.Hex(),
                                "warning":        "failed_to_update_conversation_usage_total",
                                "error":          err.Error(),
                        },
                })
        }

        // --- Upsert today's AIUsageStats row. ---
        today := normalizeToDate(now)
        if err := h.incrementDailyUsage(reqCtx, ctx.TenantID, ctx.UserID, today, 1, tokensUsed); err != nil {
                // Non-fatal — same reasoning as above.
                h.emitter.Emit(events.Event{
                        Type:      events.EventAIResponseReceived,
                        Timestamp: respTime,
                        Data: map[string]interface{}{
                                "tenantId":       ctx.TenantID.Hex(),
                                "userId":         ctx.UserID.Hex(),
                                "warning":        "failed_to_update_usage_stats",
                                "error":          err.Error(),
                        },
                })
        }

        // --- Compute remaining tokens for the response payload. ---
        updatedUsage, err := h.getTodayUsage(reqCtx, ctx.TenantID, ctx.UserID)
        if err != nil {
                updatedUsage = todayUsage // fall back to the pre-call snapshot
        }
        remaining := aiDailyTokenLimit - updatedUsage.TotalTokens
        if remaining < 0 {
                remaining = 0
                // The user just crossed the limit on this request — emit the
                // limit-reached event so downstream consumers (rate-limiter,
                // billing) can react. We still return 200 for THIS request
                // because the upstream call already succeeded; the NEXT request
                // will hit the pre-flight check above and be rejected with 429.
                h.emitter.Emit(events.Event{
                        Type:      events.EventAIUsageLimitReached,
                        Timestamp: respTime,
                        Data: map[string]interface{}{
                                "tenantId":    ctx.TenantID.Hex(),
                                "userId":      ctx.UserID.Hex(),
                                "usedTokens":  updatedUsage.TotalTokens,
                                "limitTokens": aiDailyTokenLimit,
                                "endpoint":    "chat",
                        },
                })
        }

        respondWithJSON(w, http.StatusOK, chatResponse{
                ConversationID: conversationID.Hex(),
                Message:        assistantMsg,
                Usage: chatUsage{
                        TokensUsed:      tokensUsed,
                        RemainingTokens: remaining,
                },
        })
        _ = isNew // (kept for future telemetry hooks)
}

// ===========================================================================
// GET /api/lms/ai/conversations
// ===========================================================================

// ListConversations handles GET /api/lms/ai/conversations.
//
// Returns the calling user's conversations, newest-first. Optional query
// params: ?limit= (default 50, max 200), ?offset= (default 0).
func (h *AIHandler) ListConversations(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireContext(w, r)
        if !ok {
                return
        }
        limit := parsePositiveInt(r, "limit", 50, 200)
        offset := parsePositiveInt(r, "offset", 0, 1<<30)
        opts := options.Find().
                SetLimit(int64(limit)).
                SetSkip(int64(offset)).
                SetSort(bson.D{{Key: "updatedAt", Value: -1}})
        cursor, err := h.db.AIConversations().Find(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
        }, opts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch conversations")
                return
        }
        defer cursor.Close(r.Context())

        var convs []models.AIConversation
        if err := cursor.All(r.Context(), &convs); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode conversations")
                return
        }
        if convs == nil {
                convs = []models.AIConversation{}
        }
        total, _ := h.db.AIConversations().CountDocuments(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
        })

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "conversations": convs,
                "total":         total,
                "limit":         limit,
                "offset":        offset,
        })
}

// ===========================================================================
// GET /api/lms/ai/conversations/{id}
// ===========================================================================

// GetConversation handles GET /api/lms/ai/conversations/{id}.
//
// Returns the conversation plus all of its messages, oldest-first. The
// conversation is filtered by {tenantId, _id} per the spec; the messages
// are filtered by {tenantId, conversationId} and sorted by createdAt: 1.
func (h *AIHandler) GetConversation(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireContext(w, r)
        if !ok {
                return
        }
        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid conversation id")
                return
        }

        var conv models.AIConversation
        if err := h.db.AIConversations().FindOne(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "_id":      id,
        }).Decode(&conv); err != nil {
                if err == mongo.ErrNoDocuments {
                        respondWithError(w, http.StatusNotFound, "Conversation not found")
                        return
                }
                respondWithError(w, http.StatusInternalServerError, "Failed to load conversation")
                return
        }

        cursor, err := h.db.AIMessages().Find(r.Context(), bson.M{
                "tenantId":       ctx.TenantID,
                "conversationId": id,
        }, options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}))
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch messages")
                return
        }
        defer cursor.Close(r.Context())

        var msgs []models.AIMessage
        if err := cursor.All(r.Context(), &msgs); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode messages")
                return
        }
        if msgs == nil {
                msgs = []models.AIMessage{}
        }

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "conversation": conv,
                "messages":     msgs,
        })
}

// ===========================================================================
// DELETE /api/lms/ai/conversations/{id}
// ===========================================================================

// DeleteConversation handles DELETE /api/lms/ai/conversations/{id}.
//
// Deletes the conversation and all of its messages in two operations. The
// messages are deleted first so a partial failure (conversation delete
// fails) leaves an orphaned-but-recoverable conversation rather than
// orphaned messages.
func (h *AIHandler) DeleteConversation(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireContext(w, r)
        if !ok {
                return
        }
        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid conversation id")
                return
        }

        // Verify the conversation exists and belongs to this tenant.
        var conv models.AIConversation
        if err := h.db.AIConversations().FindOne(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "_id":      id,
        }).Decode(&conv); err != nil {
                if err == mongo.ErrNoDocuments {
                        respondWithError(w, http.StatusNotFound, "Conversation not found")
                        return
                }
                respondWithError(w, http.StatusInternalServerError, "Failed to load conversation")
                return
        }

        if _, err := h.db.AIMessages().DeleteMany(r.Context(), bson.M{
                "tenantId":       ctx.TenantID,
                "conversationId": id,
        }); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete messages")
                return
        }
        if _, err := h.db.AIConversations().DeleteOne(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "_id":      id,
        }); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete conversation")
                return
        }

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "success":         true,
                "conversationId":  id.Hex(),
                "deletedMessages": true,
        })
}

// ===========================================================================
// GET /api/lms/ai/usage
// ===========================================================================

// GetUsage handles GET /api/lms/ai/usage.
//
// Returns the calling user's AIUsageStats rows, optionally filtered by a
// ?from=&to= date range (YYYY-MM-DD). Defaults to the last 30 days when no
// range is supplied. Results are sorted by date: 1 (ascending).
func (h *AIHandler) GetUsage(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
        }

        now := time.Now().UTC()
        fromDate := now.AddDate(0, 0, -30)
        toDate := now

        if fromStr := r.URL.Query().Get("from"); fromStr != "" {
                if parsed, err := time.Parse("2006-01-02", fromStr); err == nil {
                        fromDate = normalizeToDate(parsed)
                }
        }
        if toStr := r.URL.Query().Get("to"); toStr != "" {
                if parsed, err := time.Parse("2006-01-02", toStr); err == nil {
                        // Inclusive upper bound: end of the supplied day.
                        toDate = normalizeToDate(parsed).Add(24*time.Hour - time.Second)
                }
        }
        filter["date"] = bson.M{"$gte": fromDate, "$lte": toDate}

        cursor, err := h.db.AIUsageStats().Find(r.Context(), filter,
                options.Find().SetSort(bson.D{{Key: "date", Value: 1}}))
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch usage stats")
                return
        }
        defer cursor.Close(r.Context())

        var stats []models.AIUsageStats
        if err := cursor.All(r.Context(), &stats); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode usage stats")
                return
        }
        if stats == nil {
                stats = []models.AIUsageStats{}
        }

        // Compute totals across the returned window for the dashboard.
        var totalRequests, totalTokens int
        for _, s := range stats {
                totalRequests += s.TotalRequests
                totalTokens += s.TotalTokens
        }

        // Today's remaining allowance, computed against the row whose date
        // matches today (UTC midnight). Falls back to the full limit when no
        // row exists yet for today.
        today := normalizeToDate(now)
        usedToday := 0
        for _, s := range stats {
                if s.Date.Equal(today) {
                        usedToday = s.TotalTokens
                        break
                }
        }
        remaining := aiDailyTokenLimit - usedToday
        if remaining < 0 {
                remaining = 0
        }

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "usage":            stats,
                "totalRequests":    totalRequests,
                "totalTokens":      totalTokens,
                "dailyLimit":       aiDailyTokenLimit,
                "remainingTokens":  remaining,
                "from":             fromDate.Format("2006-01-02"),
                "to":               toDate.Format("2006-01-02"),
        })
}

// ===========================================================================
// POST /api/lms/ai/generate-course-outline
// ===========================================================================

// GenerateCourseOutline handles POST /api/lms/ai/generate-course-outline.
//
// Body: { topic, level?, lessonsCount? }
// Returns: { outline: { title, description, lessons: [{title, summary}] } }
//
// Calls OpenAI with a JSON-shape prompt, parses the JSON content (stripping
// markdown code fences if present), and returns the structured outline. The
// request is metered against the user's daily AIUsageStats quota.
func (h *AIHandler) GenerateCourseOutline(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireContext(w, r)
        if !ok {
                return
        }
        if !requireOpenAIKey(w) {
                return
        }

        var req courseOutlineRequest
        if err := decodeJSON(r, &req); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
                return
        }
        req.Topic = strings.TrimSpace(req.Topic)
        if req.Topic == "" {
                respondWithError(w, http.StatusBadRequest, "Topic is required")
                return
        }
        if req.Level == "" {
                req.Level = "beginner"
        }
        if req.LessonsCount <= 0 {
                req.LessonsCount = aiDefaultLessonsCount
        }
        if req.LessonsCount > aiMaxLessonsCount {
                req.LessonsCount = aiMaxLessonsCount
        }

        // Pre-flight quota check.
        todayUsage, err := h.getTodayUsage(r.Context(), ctx.TenantID, ctx.UserID)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load usage stats")
                return
        }
        if todayUsage.TotalTokens >= aiDailyTokenLimit {
                h.emitter.Emit(events.Event{
                        Type:      events.EventAIUsageLimitReached,
                        Timestamp: time.Now(),
                        Data: map[string]interface{}{
                                "tenantId":    ctx.TenantID.Hex(),
                                "userId":      ctx.UserID.Hex(),
                                "usedTokens":  todayUsage.TotalTokens,
                                "limitTokens": aiDailyTokenLimit,
                                "endpoint":    "generate-course-outline",
                        },
                })
                respondWithError(w, http.StatusTooManyRequests,
                        fmt.Sprintf("Daily AI usage limit reached (%d tokens). Try again tomorrow.", aiDailyTokenLimit))
                return
        }

        systemPrompt := "You are TutorAI, an AI course design assistant for an LMS. Generate a course outline and return it as STRICT JSON in this exact shape: {\"title\": string, \"description\": string, \"lessons\": [{\"title\": string, \"summary\": string}]}. Do not wrap the JSON in markdown code fences. Do not include any prose outside the JSON object."
        userPrompt := fmt.Sprintf(
                "Generate a course outline for the topic %q at %s level with %d lessons. "+
                        "Return JSON in this exact shape: {\"title\": string, \"description\": string, \"lessons\": [{\"title\": string, \"summary\": string}]}.",
                req.Topic, req.Level, req.LessonsCount,
        )

        callCtx, cancel := context.WithTimeout(r.Context(), aiRequestTimeout)
        defer cancel()
        content, tokensUsed, err := callOpenAI(callCtx, getOpenAIModel(), []openAIMessage{
                {Role: "system", Content: systemPrompt},
                {Role: "user", Content: userPrompt},
        }, 2048, 0.7)
        if err != nil {
                respondWithError(w, http.StatusBadGateway, "OpenAI request failed: "+err.Error())
                return
        }
        if tokensUsed <= 0 {
                tokensUsed = 1
        }

        // Parse the JSON content (after stripping any markdown fence).
        var outline courseOutline
        if err := json.Unmarshal([]byte(extractJSON(content)), &outline); err != nil {
                // Return the raw content + the parse error so the frontend can
                // surface a useful diagnostic. HTTP 502 because the upstream model
                // produced output that didn't match the requested schema.
                respondWithError(w, http.StatusBadGateway,
                        "Failed to parse course outline JSON: "+err.Error())
                return
        }
        if len(outline.Lessons) == 0 {
                outline.Lessons = []courseOutlineLesson{}
        }

        // Meter the request.
        today := normalizeToDate(time.Now())
        _ = h.incrementDailyUsage(r.Context(), ctx.TenantID, ctx.UserID, today, 1, tokensUsed)

        respondWithJSON(w, http.StatusOK, courseOutlineResponse{Outline: outline})
}

// ===========================================================================
// POST /api/lms/ai/generate-quiz
// ===========================================================================

// GenerateQuiz handles POST /api/lms/ai/generate-quiz.
//
// Body: { lessonId?, topic, questionCount?, questionTypes? }
// Returns: { quiz: { questions: [{type, question, options, correctAnswer, explanation}] } }
//
// When lessonId is supplied, the lesson's title + content are loaded and
// used to ground the generated questions in the actual course material.
func (h *AIHandler) GenerateQuiz(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireContext(w, r)
        if !ok {
                return
        }
        if !requireOpenAIKey(w) {
                return
        }

        var req quizRequest
        if err := decodeJSON(r, &req); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
                return
        }
        req.Topic = strings.TrimSpace(req.Topic)
        if req.Topic == "" {
                respondWithError(w, http.StatusBadRequest, "Topic is required")
                return
        }
        if req.QuestionCount <= 0 {
                req.QuestionCount = aiDefaultQuestionCnt
        }
        if req.QuestionCount > aiMaxQuestionCnt {
                req.QuestionCount = aiMaxQuestionCnt
        }
        if len(req.QuestionTypes) == 0 {
                req.QuestionTypes = []string{"single_choice", "true_false"}
        }
        typesStr := strings.Join(req.QuestionTypes, ", ")

        // Optional: fetch the lesson for grounding context.
        lessonContext := ""
        if req.LessonID != "" {
                lessonOID, err := primitive.ObjectIDFromHex(req.LessonID)
                if err != nil {
                        respondWithError(w, http.StatusBadRequest, "Invalid lessonId")
                        return
                }
                var lesson models.Lesson
                if err := h.db.Lessons().FindOne(r.Context(), bson.M{
                        "tenantId": ctx.TenantID,
                        "_id":      lessonOID,
                }).Decode(&lesson); err == nil {
                        lessonContext = fmt.Sprintf("\n\nLesson context:\nTitle: %s\nContent: %s",
                                lesson.Title, truncateForPrompt(lesson.Content, 4000))
                }
                // If the lesson fetch fails (wrong tenant, not found, etc.), we
                // silently fall through to topic-only generation rather than
                // blocking the request.
        }

        // Pre-flight quota check.
        todayUsage, err := h.getTodayUsage(r.Context(), ctx.TenantID, ctx.UserID)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load usage stats")
                return
        }
        if todayUsage.TotalTokens >= aiDailyTokenLimit {
                h.emitter.Emit(events.Event{
                        Type:      events.EventAIUsageLimitReached,
                        Timestamp: time.Now(),
                        Data: map[string]interface{}{
                                "tenantId":    ctx.TenantID.Hex(),
                                "userId":      ctx.UserID.Hex(),
                                "usedTokens":  todayUsage.TotalTokens,
                                "limitTokens": aiDailyTokenLimit,
                                "endpoint":    "generate-quiz",
                        },
                })
                respondWithError(w, http.StatusTooManyRequests,
                        fmt.Sprintf("Daily AI usage limit reached (%d tokens). Try again tomorrow.", aiDailyTokenLimit))
                return
        }

        systemPrompt := "You are TutorAI, an AI quiz generation assistant for an LMS. Generate fair, unambiguous questions tied to the supplied topic. Return STRICT JSON in this exact shape: {\"questions\": [{\"type\": string, \"question\": string, \"options\": [string], \"correctAnswer\": string, \"explanation\": string}]}. Do not wrap the JSON in markdown code fences. Do not include any prose outside the JSON object."
        userPrompt := fmt.Sprintf(
                "Generate a quiz with %d questions about %q. Question types: %s. "+
                        "For each question set \"type\" to one of the requested types, include an \"options\" array (omit for short_answer / essay), "+
                        "a \"correctAnswer\" (use the index of the correct option as a string for single_choice / multiple_choice, or \"true\"/\"false\" for true_false), "+
                        "and a short \"explanation\".%s",
                req.QuestionCount, req.Topic, typesStr, lessonContext,
        )

        callCtx, cancel := context.WithTimeout(r.Context(), aiRequestTimeout)
        defer cancel()
        content, tokensUsed, err := callOpenAI(callCtx, getOpenAIModel(), []openAIMessage{
                {Role: "system", Content: systemPrompt},
                {Role: "user", Content: userPrompt},
        }, 2048, 0.7)
        if err != nil {
                respondWithError(w, http.StatusBadGateway, "OpenAI request failed: "+err.Error())
                return
        }
        if tokensUsed <= 0 {
                tokensUsed = 1
        }

        var quiz quizPayload
        if err := json.Unmarshal([]byte(extractJSON(content)), &quiz); err != nil {
                respondWithError(w, http.StatusBadGateway,
                        "Failed to parse quiz JSON: "+err.Error())
                return
        }
        if len(quiz.Questions) == 0 {
                quiz.Questions = []quizQuestion{}
        }

        // Meter the request.
        today := normalizeToDate(time.Now())
        _ = h.incrementDailyUsage(r.Context(), ctx.TenantID, ctx.UserID, today, 1, tokensUsed)

        respondWithJSON(w, http.StatusOK, quizResponse{Quiz: quiz})
}

// truncateForPrompt caps a string to the supplied byte count, trimming on a
// rune boundary so we don't emit a malformed UTF-8 sequence to OpenAI. A
// trailing ellipsis is appended when truncation actually occurs.
func truncateForPrompt(s string, maxBytes int) string {
        if len(s) <= maxBytes {
                return s
        }
        // Step back to a rune boundary. A UTF-8 continuation byte is
        // 0b10xxxxxx (0x80–0xBF), so we walk `cut` backward while the byte
        // at that index is a continuation byte. The loop stops on the first
        // leading byte (or ASCII char) it finds, which is a valid cut point.
        cut := maxBytes
        for cut > 0 && s[cut]&0xC0 == 0x80 {
                cut--
        }
        return s[:cut] + "…"
}
