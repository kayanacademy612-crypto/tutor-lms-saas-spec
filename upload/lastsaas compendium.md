# jonradoff/lastsaas | Code Wiki

# jonradoff/lastsaas

sparkPowered by Gemini

[](https://github.com/jonradoff/lastsaas)

zoom\_in

The LastSaaS repository provides a multi-tenant SaaS platform, featuring a Go backend server and a React frontend application. The backend processes API requests, manages data persistence, and serves the frontend. The frontend offers the user interface for interaction.

The Go backend manages core application logic. It handles configuration management, database interactions with MongoDB, and HTTP middleware processing. Configuration settings load from YAML files and environment variables, with dynamic reloading from MongoDB for runtime updates. [Configuration Management and Dynamic Reloading](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-configuration-management-and-dynamic-reloading). It connects to MongoDB, enforces data integrity using JSON Schema validation, and manages indexes for query performance. [Database Connectivity and Schema Management](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-database-connectivity-and-schema-management). HTTP middleware components apply cross-cutting concerns such as request ID generation, panic recovery, security headers, rate limiting, and metrics collection. [Middleware Architecture](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-middleware-architecture).

The platform supports multi-tenancy, enabling distinct environments for different organizations, and handles user accounts, roles, and invitations. Authentication methods include OAuth 2.0 (GitHub, Google, Microsoft), JWT-based sessions, secure password handling, and multi-factor authentication (MFA). Role-based access control (RBAC) and tenant-based checks secure API access. [Authentication and Authorization](https://codewiki.google/github.com/jonradoff/lastsaas#authentication-and-authorization). The system integrates with Stripe for managing customer subscriptions, product synchronization, and payment processing, using webhooks for event processing and generating internal invoice numbers. [Billing and Payments (Stripe Integration)](https://codewiki.google/github.com/jonradoff/lastsaas#billing-and-payments-stripe-integration). External communications involve dispatching webhooks with retry mechanisms and cryptographic signing for secure delivery. An email service sends notifications and communications using the Resend API. [Webhooks and External Integrations](https://codewiki.google/github.com/jonradoff/lastsaas#webhooks-and-external-integrations).

A command-line interface ([`backend/cmd/lastsaas`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas)) provides tools for system administration, diagnostics, log management, process control, and financial reporting. [System Administration and CLI Tools](https://codewiki.google/github.com/jonradoff/lastsaas#system-administration-and-cli-tools). A health monitoring system tracks active nodes, collects detailed system metrics (CPU, memory, HTTP, MongoDB, Go runtime), and performs health checks on third-party integrations. [System Health and Monitoring](https://codewiki.google/github.com/jonradoff/lastsaas#system-health-and-monitoring). Daily application metrics, such as Daily Active Users (DAU) and revenue, are collected through a distributed leader election mechanism to ensure data consistency.

The React frontend provides the user interface. It manages global state for authentication, branding, and active tenant information using React Contexts. [Global State Management with React Context](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-application-structure-global-state-management-with-react-context). An API client ([`frontend/src/api/client.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts)) handles all backend interactions, including token refresh, request queuing, and managing system initialization redirects. [Frontend API Client](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-api-client). It uses [`react-router-dom`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/App.tsx#L2) for navigation, enforcing access control for protected and administrative routes. The application supports dynamic branding, applying custom styles, fonts, and content based on tenant configurations. It incorporates client-side telemetry for anonymous user interaction tracking and provides comprehensive error handling for user feedback.

## Development Environment and Setup

link

bash

content\_copyCopy

\# Copy example config to actual config cp "$EXAMPLE\_FILE" "$OUTPUT\_FILE" echo "Copied $EXAMPLE\_FILE -> $OUTPUT\_FILE" \# Validate MongoDB connection echo "" echo "--- Validating MongoDB connection ---" if command -v mongosh &> /dev/null; then \# Attempts to ping MongoDB using mongosh if mongosh "$MONGODB\_URI" --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then echo "MongoDB connection: OK" else echo "Warning: Could not connect to MongoDB at $MONGODB\_URI" echo " Make sure MongoDB is running before starting the server." fi elif command -v mongo &> /dev/null; then \# Fallback to older 'mongo' shell if mongosh is not found if mongo "$MONGODB\_URI" --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then echo "MongoDB connection: OK" else echo "Warning: Could not connect to MongoDB at $MONGODB\_URI" echo " Make sure MongoDB is running before starting the server." fi else echo "Note: mongosh not found, skipping MongoDB connection check." echo " Make sure MongoDB is accessible at $MONGODB\_URI before starting." fi

To set up a local development environment for the LastSaaS project, initial configuration and essential dependencies are addressed through a setup script. This script manages configuration files and verifies connectivity to the MongoDB database. Instructions for starting the backend server are also provided to facilitate the development workflow. For details on the setup script, refer to [Development Environment Scripting](https://codewiki.google/github.com/jonradoff/lastsaas#development-environment-and-setup-development-environment-scripting).

### Development Environment Scripting

link

bash

content\_copyCopy

\# ... (environment variable and path setup) EXAMPLE\_FILE="$CONFIG\_DIR/${ENV}.example.yaml" OUTPUT\_FILE="$CONFIG\_DIR/${ENV}.yaml" \# ... (check if example file exists and handle overwriting output file) \# Write .env file (content omitted for brevity) cat > "$ENV\_FILE" <<EOF # ... (environment variables like DATABASE\_NAME, MONGODB\_URI, JWT\_SECRETS) EOF \# Copy example config to actual config cp "$EXAMPLE\_FILE" "$OUTPUT\_FILE" echo "Copied $EXAMPLE\_FILE -> $OUTPUT\_FILE" \# Validate MongoDB connection echo "" echo "--- Validating MongoDB connection ---" if command -v mongosh &> /dev/null; then \# Use mongosh to ping MongoDB if mongosh "$MONGODB\_URI" --eval "db.adminCommand('ping')" --quiet 2>/dev/null; then echo "MongoDB connection: OK" else echo "Warning: Could not connect to MongoDB at $MONGODB\_URI" fi \# ... (similar logic for 'mongo' command, and handling if neither is found) else echo "Note: mongosh not found, skipping MongoDB connection check." fi

The [`setup.sh`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L344) script, located in the [`scripts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/scripts) directory, automates key aspects of setting up a local development environment. Its primary functions include managing configuration files, verifying MongoDB connectivity, and providing instructions for starting the backend server.

The script facilitates configuration management by copying an example configuration file for the selected environment to its active configuration, ensuring that the development environment is properly initialized with necessary settings.

To ensure the database is accessible, the [`setup.sh`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L344) script verifies MongoDB connectivity. It uses available MongoDB shell clients (e.g., [`mongosh`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/scripts/setup.sh#L98) or [`mongo`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L39)) to execute a ping command, confirming that the database instance is reachable from the development machine.

After successfully configuring the environment and verifying database access, the script provides instructions for launching the backend server. It guides the developer to source the [`.env`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L355) file and execute the [`go run ./cmd/server`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L341) command from the backend directory, outlining the necessary steps to initiate the server process.

## Backend Server Architecture

link

zoom\_in

The LastSaaS backend is built with Go and serves as the core application server, handling API requests, managing data interactions, and serving static frontend content. Its architecture emphasizes modularity, security, and observability. The primary executable component for the backend server is located in [`backend/cmd/server`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server).

The server's lifecycle, from initialization to graceful shutdown, is managed by the [`main`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L90) function within [`backend/cmd/server/main.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go). This function orchestrates the loading of application configurations from YAML files, with support for environment variable expansion, as detailed further in [Configuration Management and Dynamic Reloading](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-configuration-management-and-dynamic-reloading). A connection to the MongoDB database is established and maintained, ensuring data persistence and integrity through schema validation and index management, which is elaborated upon in [Database Connectivity and Schema Management](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-database-connectivity-and-schema-management). The application's version is loaded, and necessary database migrations are performed to ensure compatibility.

A wide array of internal services are initialized to support the SaaS application's various functionalities. These include services for authentication, email delivery, Stripe billing integration, webhook dispatch, and robust logging. The server also incorporates comprehensive health monitoring and telemetry services for collecting application data and metrics, which are further discussed in [Health Monitoring and System Metrics](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-health-monitoring-and-system-metrics).

API routing is handled through an extensive set of defined routes, categorized by functionality and access control requirements (public, guarded, protected, role-based). These routes are protected and enhanced by various HTTP middleware components, which manage cross-cutting concerns such as request ID generation, panic recovery, security headers, request body size limits, rate limiting, and metrics collection. For more details, refer to [Middleware Architecture](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-middleware-architecture).

The server is also responsible for serving the frontend Single Page Application (SPA). It intelligently serves static files from a specified directory and rewrites requests not matching static files to the [`index.html`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/VERSIONS.md?plain=1#L50) file, enabling client-side routing. This ensures a seamless user experience by dynamically injecting the application name to prevent title flicker during initial loading.

### Configuration Management and Dynamic Reloading

link

zoom\_in

Application configuration in LastSaaS is managed through a system designed for flexibility, security, and runtime adaptability. Core settings are defined in YAML files, which serve as blueprints for various deployment environments such as [`dev`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L315) and [`production`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L284). These files can incorporate environment variables, allowing for dynamic overrides and sensitive data injection without modifying the base configuration files. Before being loaded into the application, configuration values undergo validation to ensure critical parameters, such as database connection strings, JWT secrets, and server ports, meet predefined integrity and security standards. This process, primarily handled by the functions within [`backend/internal/config/config.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/config/config.go), ensures that the application starts with a coherent and secure set of parameters.

Beyond initial loading, LastSaaS implements a robust configuration store, detailed in [`backend/internal/configstore`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/configstore). This store manages application-wide configuration variables, which are persistently stored in MongoDB. To optimize performance and ensure consistency across a distributed environment, these variables are also maintained in a thread-safe, in-memory cache. The system supports automatic reloading, where a background process periodically synchronizes the in-memory cache with any changes made to the configuration variables in the database. This enables administrators to modify application settings at runtime, with changes propagating to all running instances without requiring a service restart. The configuration store also incorporates mechanisms to seed default values into the database during initial setup, ensuring a baseline operational configuration while allowing for subsequent administrative customization. Additionally, comprehensive validation is applied to these configuration variables, especially for template types, to mitigate common security vulnerabilities like XSS or code injection.

### Database Connectivity and Schema Management

link

zoom\_in

The LastSaaS backend manages interactions with MongoDB, ensuring data integrity through structured connections, schema validation, and optimized indexing. The [`NewMongoDB`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L20) function in [`backend/internal/db/mongodb.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go) initializes the database connection using a provided URI and database name. This function configures connection pool options and verifies connectivity. During initialization, it creates necessary indexes across various collections and applies JSON Schema validators to maintain data consistency.

Schema validation is defined in [`backend/internal/db/schema.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go). This file contains the [`AllSchemas`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go#L18) function, which centralizes the definition of JSON Schemas for various MongoDB collections. The [`EnsureSchemaValidation`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go#L41) method iterates through these schemas, creating collections if they don't exist and applying or updating validators using the [`collMod`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go#L40) command. This process sets the [`validationLevel`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go#L52) to "moderate" and [`validationAction`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go#L53) to "error", which enforces schema rules on new inserts and updates while allowing existing documents to remain. Each collection's specific schema (e.g., [`usersSchema`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go#L66), [`tenantsSchema`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go#L112)) defines expected data types, required fields, and constraints.

Index management is handled by the [`ensureIndexes`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L52) function in [`backend/internal/db/mongodb.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go). This function defines and creates indexes for collections such as [`users`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L333), [`tenants`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L337), and [`financial_transactions`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/schema.go#L306). These indexes are configured with options like [`SetUnique`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L63) for uniqueness, [`SetSparse`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L63) for sparse indexes, and [`SetExpireAfterSeconds`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L93) for time-to-live (TTL) functionality, which are important for data integrity and performance. Failures in creating indexes for critical collections can halt the application startup, while non-critical index failures are logged as warnings. The [`MongoDB`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L15) struct provides accessor methods like [`Users`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L333) and [`Tenants`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L337) to simplify interaction with specific collections.

### Middleware Architecture

link

The backend of the LastSaaS application employs a suite of HTTP middleware components to manage various cross-cutting concerns, ensuring consistency, security, and observability across its API endpoints. These middleware functions intercept HTTP requests and responses, allowing for the application of policies and enhancements before or after the main business logic executes.

To ensure each request can be uniquely identified and tracked, a [`RequestID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/requestid.go#L15) middleware, found in [`backend/internal/middleware/requestid.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/requestid.go), generates a unique identifier for every incoming HTTP request. This ID is then added to the [`X-Request-ID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/VERSIONS.md?plain=1#L48) response header and stored in the request's context, making it available for logging and tracing throughout the request lifecycle.

For system stability, a [`Recovery`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/recovery.go#L11) middleware, defined in [`backend/internal/middleware/recovery.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/recovery.go), gracefully handles panics that may occur within HTTP handlers. This prevents server crashes, logs the error details along with a stack trace, and returns a generic [`500 Internal Server Error`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L248) to the client.

Security is enhanced through the [`SecurityHeaders`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/security.go#L8) middleware in [`backend/internal/middleware/security.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/security.go). This component automatically injects a range of standard security-related HTTP headers into every response. These headers include [`X-Content-Type-Options`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L273), [`X-XSS-Protection`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/security.go#L11), [`Referrer-Policy`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L273), [`Strict-Transport-Security`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/security.go#L13), [`Permissions-Policy`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L273), [`X-Frame-Options`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L273), and [`Content-Security-Policy`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/security.go#L25). This approach fortifies the application against common web vulnerabilities like cross-site scripting (XSS), clickjacking, and MIME type sniffing.

To prevent resource exhaustion and denial-of-service attacks, a [`BodySizeLimit`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/bodylimit.go#L7) middleware in [`backend/internal/middleware/bodylimit.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/bodylimit.go) enforces a maximum allowable size for incoming request bodies. Requests with bodies exceeding this limit are rejected, preventing excessively large payloads from consuming server resources.

The application also incorporates a sophisticated rate-limiting mechanism, implemented in [`backend/internal/middleware/ratelimit.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/ratelimit.go). This [`RateLimiter`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/ratelimit.go#L19) can operate in both in-memory and MongoDB-backed distributed modes, allowing it to control the frequency of requests from individual clients or IP addresses. When limits are exceeded, it responds with an [`http.StatusTooManyRequests`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/auth.go#L333) (429) status, protecting backend services from overload.

Finally, for continuous monitoring and performance analysis, a [`MetricsCollector`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/metrics.go#L14) in [`backend/internal/middleware/metrics.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/metrics.go) gathers in-memory HTTP request metrics. This includes tracking total request counts, distributing counts by HTTP status code (2xx, 3xx, 4xx, 5xx), and measuring request latencies. These metrics can be periodically snapshotted and reset by a background process, contributing to the system's [Health Monitoring and System Metrics](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-health-monitoring-and-system-metrics).

### Health Monitoring and System Metrics

link

zoom\_in

The health monitoring service provides insight into the operational status and performance of the LastSaaS system. It handles the registration and tracking of individual system nodes, collects a range of system and application metrics, and performs regular health checks on third-party integrations.

The service identifies each running instance of the application as a unique node. These nodes periodically send heartbeats, updating their status and last seen timestamps in the database, ensuring that the system maintains an up-to-date registry of active instances. If a node fails to report within a configured timeframe, it is marked as stale.

A comprehensive set of metrics is collected from each active node. This includes system-level data such as CPU utilization, memory usage, disk I/O, and network activity. Application-specific metrics are also gathered, covering HTTP request statistics (counts, latency percentiles, error rates), MongoDB [`serverStatus`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L309) and [`dbStats`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_db.go#L39), and Go runtime diagnostics (heap, goroutines, garbage collection). Additionally, the service tracks API call counts to external services like Stripe, Resend, and DataDog, managed by the API counter mechanism. These collected metrics are stored in the database for historical analysis and real-time monitoring.

Beyond internal system health, the service also monitors the availability and responsiveness of integrated third-party services. This includes checks for MongoDB connectivity, Stripe API access, Resend email service status, and the reachability of various OAuth providers (Google, GitHub, Microsoft). These integration checks are performed periodically, and their statuses are recorded, providing a centralized view of external dependencies. The overall health of the system is considered healthy only if all configured integrations are functioning correctly. For more details on the implementation of these external API call counters, refer to [Asynchronous DataDog Integration](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-asynchronous-datadog-integration).

### Daily Metrics Collection with Distributed Leader Election

link

zoom\_in

The system incorporates a mechanism for collecting daily application metrics such as Daily Active Users (DAU), Weekly Active Users (WAU), Monthly Active Users (MAU), revenue, and Annual Recurring Revenue (ARR). This process uses a MongoDB-based distributed leader election to ensure that only a single instance of the application performs the metric collection at any given time, thereby maintaining data consistency and reducing redundant computation.

A dedicated service manages this process, initializing with a unique identifier for the current instance. It orchestrates the acquisition and renewal of a distributed lock in MongoDB, allowing only the designated leader to proceed with metric collection. The leader periodically renews its lock to prevent other instances from taking over, and upon graceful shutdown, it explicitly releases the lock.

Metric collection involves aggregating data from various MongoDB collections. DAU, WAU, and MAU are derived by analyzing user login activity. Revenue is calculated from financial transaction records for the day. ARR is determined by aggregating active subscriptions and their associated plan prices. The computed metrics are then stored in a [`daily_metrics`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L186) collection in MongoDB, identified by the date. This approach ensures that even in multi-instance deployments, metric calculations are performed once per day per metric, contributing to operational efficiency and data integrity.

### Asynchronous DataDog Integration

link

zoom\_in

The LastSaaS backend integrates with DataDog through an asynchronous, buffered client designed to submit metrics, events, logs, and service checks without requiring a local DataDog Agent. This client, defined in [`backend/internal/datadog/client.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/datadog/client.go), manages the outgoing telemetry data to DataDog's REST API.

The client operates using dedicated background goroutines that handle the buffering and periodic flushing of different data types. For instance, [`metricsFlushLoop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/datadog/client.go#L413) and [`logsFlushLoop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/datadog/client.go#L494) batch metrics and logs before submission, incorporating error handling with exponential backoff for failed deliveries. Events and service checks are typically submitted more immediately due to their nature.

Key aspects of this integration include API key validation, which is performed during the client's initialization and as part of its [`Startup`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/datadog/client.go#L152) process. This ensures connectivity and proper authentication with the DataDog API. The [`Startup`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/datadog/client.go#L152) process also sends an initial event and heartbeat metric to confirm the application's status and presence. For a broader understanding of how system health and metrics are gathered, refer to [Health Monitoring and System Metrics](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-health-monitoring-and-system-metrics) and [System Health and Monitoring](https://codewiki.google/github.com/jonradoff/lastsaas#system-health-and-monitoring). The client is designed for graceful shutdown, ensuring that all buffered data is flushed before the application fully terminates.

### Internal Event System

link

go

content\_copyCopy

type EventType string const ( EventSystemInitialized EventType = "system.initialized" EventUserRegistered EventType = "user.registered" // ... other EventType constants EventSubscriptionActivated EventType = "subscription.activated" // ... billing and audit EventType constants ) // Event represents a system event with a type, timestamp, and arbitrary data. type Event struct { Type EventType Timestamp time.Time Data map\[string\]interface{} } // Emitter defines the interface for emitting events. type Emitter interface { Emit(event Event) } // NoopEmitter is a no-operation implementation of the Emitter interface. type NoopEmitter struct{} func (n \*NoopEmitter) Emit(\_ Event) {} func NewNoopEmitter() Emitter { return &NoopEmitter{} }

The internal event system facilitates communication between different components of the application without direct dependencies, thereby decoupling various parts of the system. This design allows for a flexible and extensible architecture where new functionalities can react to existing events without modifying the event producers.

The core of this system is defined in [`backend/internal/events/emitter.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/events/emitter.go). It introduces the concept of an [`Event`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/events/emitter.go#L36), which encapsulates a type, a timestamp, and arbitrary data associated with the event. [`EventType`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webhook.go#L98) constants provide a categorized list of predefined events, such as [`EventSystemInitialized`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/events/emitter.go#L8), [`EventUserRegistered`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/events/emitter.go#L9), and [`EventSubscriptionActivated`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/events/emitter.go#L24), ensuring consistency in event identification.

The [`Emitter`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/events/emitter.go#L42) interface defines the contract for dispatching these events. Any component that needs to process or propagate events implements this interface. A [`NoopEmitter`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/events/emitter.go#L46) implementation is provided for scenarios where event processing is not required, such as during testing or in environments where event handling is intentionally disabled. This allows for conditional event processing strategies without altering the event generation logic.

## API Endpoints and Data Models

link

zoom\_in

The LastSaaS backend provides a comprehensive suite of HTTP API endpoints to manage both administrative and user-facing functionalities. These endpoints facilitate interactions with the application's core data models, which define the structure and validation rules for critical entities such as users, tenants, billing information, and system configurations.

The API handlers, primarily located in [`backend/internal/api/handlers`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers), are responsible for processing requests, interacting with the database, and returning structured responses. These handlers are categorized to manage specific domains:

-   **Administrative Endpoints**: A dedicated set of handlers in [`backend/internal/api/handlers/admin.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/admin.go) provides extensive control over the system. This includes managing tenants and users, allowing administrators to update statuses, invite members, impersonate users, export data, and access dashboard metrics. API keys are managed through [`backend/internal/api/handlers/apikeys.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/apikeys.go), enabling their creation, listing, and revocation. Credit bundles, which represent purchasable credit packages, are managed through CRUD operations defined in [`backend/internal/api/handlers/bundles.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/bundles.go), with a public endpoint for active bundles. System configuration variables, such as feature flags or global settings, can be listed, retrieved, updated, created, and deleted via [`backend/internal/api/handlers/config.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/config.go). Event definitions, used for tracking user-defined events, are also managed, including the visualization of telemetry flows via Sankey diagrams in [`backend/internal/api/handlers/event_definitions.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/event_definitions.go). For system health, administrative handlers in [`backend/internal/api/handlers/health.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/health.go) display node statuses, metrics, and integration health checks. Log management in [`backend/internal/api/handlers/logs.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/logs.go) offers advanced filtering and export capabilities.
-   **Authentication and Authorization Endpoints**: User authentication and session management are handled by [`backend/internal/api/handlers/auth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/auth.go). This includes user registration, login, logout, token refresh, password management (reset, change), multi-factor authentication (MFA) setup and verification, email verification, and integrations with OAuth providers like Google, GitHub, and Microsoft. Session listing and revocation, as well as account actions like deletion and data export, are also covered.
-   **Billing and Subscriptions Endpoints**: Financial operations are managed through [`backend/internal/api/handlers/billing.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/billing.go), providing functionalities such as initiating Stripe Checkout sessions, accessing the Stripe Billing Portal, listing transactions, generating invoice PDFs, and canceling subscriptions. Administrative endpoints are available for listing financial transactions, retrieving financial metrics (revenue, ARR, DAU, WAU, MAU), and managing subscriptions.
-   **System Initialization Endpoints**: The application's initialization status is managed by [`backend/internal/api/handlers/bootstrap.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/bootstrap.go), ensuring that certain routes are only accessible after the system setup is complete.
-   **Branding and Content Management Endpoints**: Endpoints in [`backend/internal/api/handlers/branding.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/branding.go) allow for managing application branding configurations, including logos, favicons, and custom public pages.
-   **User Messaging Endpoints**: User-specific messages, including listing, unread counts, and marking messages as read, are handled by [`backend/internal/api/handlers/messages.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/messages.go).
-   **Documentation Endpoints**: The API dynamically generates documentation in HTML and Markdown formats through [`backend/internal/api/handlers/docs.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/docs.go), and provides an OpenAPI 3.0 specification via [`backend/internal/api/handlers/openapi.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/openapi.go), offering a machine-readable description of the API.

Complementing these API endpoints are the core data models defined in [`backend/internal/models`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models). These Go structs serve as the blueprint for data persistence in MongoDB and for JSON serialization/deserialization across API interactions. They incorporate validation rules to ensure data integrity and consistency. Key data models include:

-   **User and Authentication**: The [`User`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/user.go#L20) struct in [`backend/internal/models/user.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/user.go) defines user accounts, their authentication methods ([`AuthMethod`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/user.go#L9)), password hashes, and MFA configurations. [`WebAuthnCredential`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webauthn_credential.go#L9) in [`backend/internal/models/webauthn_credential.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webauthn_credential.go) supports passwordless authentication. Various [`tokens`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L102) in [`backend/internal/models/tokens.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go), such as [`VerificationToken`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go#L18), [`RefreshToken`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go#L28), and [`AuthCode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go#L63), manage different stages of authentication flows.
-   **Tenant and Membership**: The [`Tenant`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tenant.go#L9) struct in [`backend/internal/models/tenant.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tenant.go) defines the core tenant entity, including its status, billing details, and unique identifiers. [`TenantMembership`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/membership.go#L17) in [`backend/internal/models/membership.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/membership.go) links users to tenants with specific [`MemberRole`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/membership.go#L9)s, while [`Invitation`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/invitation.go#L16) in [`backend/internal/models/invitation.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/invitation.go) handles inviting users to join tenants.
-   **Billing and Subscription**: [`FinancialTransaction`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L29), [`StripeMapping`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L52), [`InvoiceCounter`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L62), and [`DailyMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L68) in [`backend/internal/models/billing.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go) manage financial records, Stripe integration, and aggregated business metrics. [`Plan`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/plan.go#L37) in [`backend/internal/models/plan.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/plan.go) defines subscription plans with details on pricing, entitlements, and credit policies, while [`CreditBundle`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/credit_bundle.go#L9) in [`backend/internal/models/credit_bundle.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/credit_bundle.go) represents purchasable credit packages.
-   **System Configuration and Health**: [`SystemConfig`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system.go#L9) in [`backend/internal/models/system.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system.go) stores global system settings, and [`ConfigVar`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/config_var.go#L18) in [`backend/internal/models/config_var.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/config_var.go) manages individual configuration variables. For system monitoring, [`SystemNode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L18), [`SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L30), and [`IntegrationCheck`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L109) in [`backend/internal/models/health.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go) capture node status, detailed system metrics, and the health of integrated services. More details are available in [System Health and Monitoring](https://codewiki.google/github.com/jonradoff/lastsaas#system-health-and-monitoring).
-   **Branding and Content**: [`BrandingConfig`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L22), [`NavItem`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L10), [`BrandingAsset`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L69), and [`CustomPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L80) in [`backend/internal/models/branding.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go) allow for extensive customization of the application's appearance and static content.
-   **Events, Logs, and Webhooks**: [`Announcement`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/announcement.go#L9) in [`backend/internal/models/announcement.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/announcement.go) manages system-wide announcements. [`Message`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L125) in [`backend/internal/models/message.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/message.go) defines internal user messages. [`SystemLog`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system_log.go#L30) in [`backend/internal/models/system_log.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system_log.go) standardizes log entries with severity and category. [`UsageEvent`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/usage_event.go#L9) in [`backend/internal/models/usage_event.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/usage_event.go) tracks user activity, while [`EventDefinition`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/event_definition.go#L10) in [`backend/internal/models/event_definition.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/event_definition.go) defines custom event types. [`TelemetryEvent`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/telemetry.go#L10) in [`backend/internal/models/telemetry.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/telemetry.go) is used for product analytics. [`Webhook`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webhook.go#L81) in [`backend/internal/models/webhook.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webhook.go) defines configurations for external webhooks.
-   **Security**: [`APIKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/api_key.go#L20) in [`backend/internal/models/api_key.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/api_key.go) stores API key details. [`SSOConnection`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/sso_connection.go#L9) in [`backend/internal/models/sso_connection.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/sso_connection.go) manages Single Sign-On configurations for tenants.

These data models and API endpoints collectively form the backbone of the LastSaaS application, enabling its multi-tenant architecture and a wide array of administrative and user-facing features.

### Core Data Models and Schema Definitions

link

zoom\_in

The application's fundamental data structures are defined by various Go [`struct`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L5)s, primarily residing within the [`backend/internal/models`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models) directory. These models are central to how data is stored, validated, and exchanged across the system, covering user management, authentication, billing, configuration, and operational tracking.

For user and tenant management, the [`User`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/user.go#L20) struct ([`backend/internal/models/user.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/user.go)) defines user accounts with details such as email, display name, password hash, supported authentication methods (like password, Google, GitHub, Microsoft, magic link, and passkey), and various status flags including email verification, account activity, and multi-factor authentication (MFA) status. Similarly, the [`Tenant`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tenant.go#L9) struct ([`backend/internal/models/tenant.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tenant.go)) represents an organization or workspace, encompassing its name, slug, active status, billing details (plan, credits, Stripe integration IDs, billing status), seat quantity, and timestamps. Relationships between users and tenants are managed by the [`TenantMembership`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/membership.go#L17) struct ([`backend/internal/models/membership.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/membership.go)), which assigns roles (Owner, Admin, User) to users within a specific tenant and includes a hierarchy for permission checking. Invitations for users to join tenants are modeled by the [`Invitation`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/invitation.go#L16) struct ([`backend/internal/models/invitation.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/invitation.go)), tracking invitee email, assigned role, and invitation status.

Authentication and authorization mechanisms rely on a set of token models. The [`VerificationToken`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go#L18) struct ([`backend/internal/models/tokens.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go)) is used for actions like email verification, password resets, magic links, and MFA challenges. [`RefreshToken`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go#L28) ([`backend/internal/models/tokens.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go)) provides a mechanism for obtaining new access tokens without re-authentication, while [`RevokedToken`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go#L42) ([`backend/internal/models/tokens.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go)) stores information about tokens that have been explicitly invalidated. For OAuth 2.0 flows, [`OAuthState`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go#L49) ([`backend/internal/models/tokens.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go)) handles state parameters to prevent CSRF, and [`AuthCode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go#L63) ([`backend/internal/models/tokens.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tokens.go)) represents authorization codes exchanged for tokens. WebAuthn credentials are stored using the [`WebAuthnCredential`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webauthn_credential.go#L9) struct ([`backend/internal/models/webauthn_credential.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webauthn_credential.go)), which securely holds public keys and other authenticator details. Additionally, [`APIKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/api_key.go#L20) ([`backend/internal/models/api_key.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/api_key.go)) defines the structure for API keys, including their authority levels and usage tracking, and [`SSOConnection`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/sso_connection.go#L9) ([`backend/internal/models/sso_connection.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/sso_connection.go)) and [`SSOAttributeMap`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/sso_connection.go#L23) ([`backend/internal/models/sso_connection.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/sso_connection.go)) manage Single Sign-On (SSO) configurations and attribute mappings for enterprise integrations.

Billing and payment processes are orchestrated through several models integrated with Stripe. The [`FinancialTransaction`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L29) struct ([`backend/internal/models/billing.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go)) records all payment events, including type, amount, associated Stripe IDs, and plan/bundle information. [`StripeMapping`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L52) ([`backend/internal/models/billing.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go)) links internal product/plan IDs to their corresponding Stripe IDs, facilitating synchronization. [`InvoiceCounter`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L62) ([`backend/internal/models/billing.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go)) ensures unique, sequential invoice number generation. Subscription plans are defined by the [`Plan`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/plan.go#L37) struct ([`backend/internal/models/plan.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/plan.go)), detailing pricing models (flat, per-seat), included seats, usage credits, trial periods, and feature entitlements. [`CreditBundle`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/credit_bundle.go#L9) ([`backend/internal/models/credit_bundle.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/credit_bundle.go)) models purchasable packages of credits.

System configuration and operational monitoring are managed by dedicated data structures. The [`SystemConfig`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system.go#L9) struct ([`backend/internal/models/system.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system.go)) stores global settings like initialization status and application version. Dynamic configuration variables are handled by [`ConfigVar`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/config_var.go#L18) ([`backend/internal/models/config_var.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/config_var.go)), allowing for named, typed, and validated system-wide settings. For system health and monitoring, [`SystemNode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L18) ([`backend/internal/models/health.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go)) represents individual server instances, tracking their status and last seen times. [`SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L30) ([`backend/internal/models/health.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go)) captures detailed snapshots of CPU, memory, disk, network, HTTP, MongoDB, and Go runtime metrics at specific timestamps. Aggregated daily business metrics, such as DAU, WAU, MAU, revenue, and ARR, are stored in [`DailyMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L68) ([`backend/internal/models/billing.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go)).

For communications and event tracking, [`Announcement`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/announcement.go#L9) ([`backend/internal/models/announcement.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/announcement.go)) defines the structure for system-wide announcements. [`Message`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L125) ([`backend/internal/models/message.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/message.go)) models internal user messages, including sender, subject, body, and read status. [`SystemLog`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system_log.go#L30) ([`backend/internal/models/system_log.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system_log.go)) provides a standardized format for logging system events with severity, category, and contextual metadata. User activity is tracked via [`UsageEvent`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/usage_event.go#L9) ([`backend/internal/models/usage_event.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/usage_event.go)), recording events within a tenant and associated quantity. [`EventDefinition`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/event_definition.go#L10) ([`backend/internal/models/event_definition.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/event_definition.go)) allows for defining custom event types, potentially in a hierarchical manner. Webhooks are configured using the [`Webhook`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webhook.go#L81) struct ([`backend/internal/models/webhook.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webhook.go)), which specifies target URLs, secrets, and subscribed event types, while [`WebhookDelivery`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webhook.go#L95) ([`backend/internal/models/webhook.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/webhook.go)) logs delivery attempts. Finally, client-side and server-side telemetry events are captured by [`TelemetryEvent`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/telemetry.go#L10) ([`backend/internal/models/telemetry.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/telemetry.go)), which includes event name, category, user/tenant context, session ID, and custom properties.

All these [`struct`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L5)s are designed for persistence in MongoDB, indicated by [`bson`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L36) struct tags, and for API interactions, using [`json`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L557) struct tags. Many fields also incorporate [`validate`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/datadog/client.go#L388) tags, ensuring that incoming data adheres to predefined rules before being processed or stored, contributing to overall data integrity.

## Authentication and Authorization

link

zoom\_in

The LastSaaS application incorporates several mechanisms to manage user authentication and authorization. This includes external OAuth 2.0 providers, JSON Web Token (JWT) based sessions, secure password management, and multi-factor authentication (MFA). Access control is further enforced through HTTP middleware, which handles API key validation, role-based access control (RBAC), and tenant-specific authorizations.

For external identity providers, the system integrates with GitHub, Google, and Microsoft using OAuth 2.0 flows. This enables users to authenticate via their existing accounts with these services. The process involves generating authorization URLs, exchanging authorization codes for tokens, and securely retrieving user information from the respective OAuth providers. The relevant logic for these integrations is encapsulated within the [`backend/internal/auth`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth) directory, with dedicated services such as [`backend/internal/auth/github_oauth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/github_oauth.go), [`backend/internal/auth/google_oauth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/google_oauth.go), and [`backend/internal/auth/microsoft_oauth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/microsoft_oauth.go).

Session management relies on JSON Web Tokens (JWTs), which are generated and validated by a dedicated service within [`backend/internal/auth/jwt.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/jwt.go). This service issues various types of tokens, including access tokens for API access, refresh tokens for long-lived sessions, MFA tokens for multi-factor authentication challenges, and impersonation tokens for administrative overrides. Each token type has specific claims and expiration policies to ensure security and proper access delegation.

Password-based authentication is supported through a secure password service, implemented in [`backend/internal/auth/password.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/password.go). This service uses bcrypt for hashing passwords and performs constant-time comparisons to mitigate user enumeration attacks. It also enforces password strength policies by validating against common patterns and complexity rules to enhance security.

To bolster user security, multi-factor authentication (MFA) is implemented using Time-based One-Time Passwords (TOTP), as detailed in [`backend/internal/auth/totp.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/totp.go). This includes the generation and secure storage of TOTP secrets, validation of one-time codes, and the provision of recovery codes for emergency access.

Access control and authentication are centrally managed through a suite of HTTP middleware components, located in [`backend/internal/middleware`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware). The [`AuthMiddleware`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/auth.go#L28) in [`backend/internal/middleware/auth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/auth.go) is responsible for authenticating incoming requests, supporting both JWTs and API keys. For API keys, it distinguishes between user-level and administrative keys, applying appropriate contextual information for root tenants. The system also uses middleware for role-based access control ([`RequireRole`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/rbac.go#L9)) and tenant-based checks, ensuring that users have the necessary permissions and are members of the specified tenant before accessing resources. This ensures that only authorized users and services can interact with the backend APIs. More details on how these middleware components work can be found under [HTTP Middleware for Authentication and Authorization](https://codewiki.google/github.com/jonradoff/lastsaas#authentication-and-authorization-http-middleware-for-authentication-and-authorization).

### OAuth 2.0 Integration and Providers

link

zoom\_in

The LastSaaS backend integrates OAuth 2.0 to enable third-party authentication through popular providers like GitHub, Google, and Microsoft. This functionality allows users to sign up and log in using their existing accounts from these services, streamlining the authentication process.

The system manages the entire OAuth flow for each provider, from initiating the authentication request to securely retrieving user information. This involves:

-   **Generating Authorization URLs**: Each OAuth service can generate a unique URL that redirects the user to the respective provider's login page, requesting specific permissions (scopes) and including a [`state`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ErrorBoundary.tsx#L9) parameter for security against cross-site request forgery (CSRF) attacks.
-   **Exchanging Authorization Codes for Tokens**: After a user grants permission, the OAuth provider redirects them back to a predefined callback URL with an authorization code. The system then exchanges this code for an [`oauth2.Token`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/google_oauth.go#L51), which includes access and potentially refresh tokens.
-   **Retrieving User Information**: Once an access token is obtained, the system uses it to fetch user profile details from the OAuth provider's API. This information, such as user ID, email, and display name, is then used to create or link to an existing user account within LastSaaS.

The core implementation for these services is found in files like [`backend/internal/auth/github_oauth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/github_oauth.go) for GitHub, [`backend/internal/auth/google_oauth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/google_oauth.go) for Google, and [`backend/internal/auth/microsoft_oauth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/microsoft_oauth.go) for Microsoft. Each of these files defines a dedicated service ([`GitHubOAuthService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/github_oauth.go#L14), [`GoogleOAuthService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/google_oauth.go#L19), [`MicrosoftOAuthService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/microsoft_oauth.go#L12)) that encapsulates the configuration and methods necessary for its respective provider. This modular approach ensures that each integration is managed independently, allowing for specific configurations and handling nuances of each provider's API. The system also includes mechanisms to retrieve the primary email address, even if it's not immediately available in the initial user profile response, as seen in the GitHub integration which may query an additional endpoint for user emails. Error handling differentiates between issues during code exchange versus user information retrieval, aiding in debugging and user feedback.

### JWT Management and Token Types

link

Token Type

Primary Claims

Expiration

Access Token

`UserID`, `Email`, `DisplayName`, `TokenType` ("access")

Configurable (default: 60 minutes)

Refresh Token

`UserID`

Configurable (default: 30 days)

MFA Token

`UserID`, `Email`, `TokenType` ("mfa"), `MFAPending` (true)

5 minutes

Impersonation Token

`UserID`, `Email`, `DisplayName`, `TokenType` ("impersonation"), `ImpersonatedBy`

5 minutes

The [`JWTService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/jwt.go#L15) located in [`backend/internal/auth/jwt.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/jwt.go) is responsible for generating, validating, and managing JSON Web Tokens (JWTs) used throughout the application for various authentication purposes. This service utilizes HS256 signing to ensure token integrity and authenticity.

The service issues distinct types of tokens, each tailored for a specific use case and containing relevant claims:

-   **Access Tokens** provide short-lived access to protected resources. They contain claims such as the user's ID, email, display name, and a [`TokenType`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/jwt.go#L26) indicating "access". Their expiration is typically configured to 60 minutes.
-   **Refresh Tokens** are longer-lived tokens used to obtain new access tokens without requiring the user to re-authenticate. They primarily contain the user's ID and have a longer expiration period, commonly 30 days.
-   **MFA Tokens** are a specialized form of access token issued during a multi-factor authentication flow. They carry a [`MFAPending`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/jwt.go#L27) claim set to [`true`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/fly.toml#L8), signifying that an additional authentication step is required. These tokens have a very short expiration of 5 minutes to limit their window of validity.
-   **Impersonation Tokens** are used when an administrator needs to temporarily act on behalf of another user. These tokens include an [`ImpersonatedBy`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/jwt.go#L28) claim and also have a short 5-minute expiration, enhancing security during administrative actions.

Each token type is generated with specific claims and a defined Time-To-Live (TTL), which can be configured during the initialization of the [`JWTService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/jwt.go#L15). The service also provides validation functions that parse incoming tokens, verify their signatures, and check their expiration status, distinguishing between invalid and expired tokens. This approach allows for granular control over user sessions and security contexts within the application.

### Secure Password Handling and Strength Validation

link

go

content\_copyCopy

// PasswordService handles password hashing, comparison, and validation. type PasswordService struct { cost int // bcrypt cost factor } // NewPasswordService creates a new PasswordService with default bcrypt cost. func NewPasswordService() \*PasswordService { return &PasswordService{cost: bcryptCost} // bcryptCost is defined in source } // HashPassword generates a bcrypt hash of the given password. func (s \*PasswordService) HashPassword(password string) (string, error) { bytes, err := bcrypt.GenerateFromPassword(\[\]byte(password), s.cost) if err != nil { return "", err } return string(bytes), nil } // ComparePassword compares a hashed password with a plaintext password. // Returns nil on success, or an error if they don't match. func (s \*PasswordService) ComparePassword(hashedPassword, password string) error { return bcrypt.CompareHashAndPassword(\[\]byte(hashedPassword), \[\]byte(password)) } // DummyCompare performs a constant-time comparison against a dummy hash. // Used to prevent timing attacks for non-existent users. func (s \*PasswordService) DummyCompare(password string) { \_ = bcrypt.CompareHashAndPassword(\[\]byte(dummyHash), \[\]byte(password)) // dummyHash is pre-computed } // ValidatePasswordStrength checks for common password weaknesses. func (s \*PasswordService) ValidatePasswordStrength(password string) error { if len(password) < minPasswordLength { // minPasswordLength is 10 return ErrPasswordTooShort } if commonPasswords\[strings.ToLower(password)\] { // commonPasswords map is in source return ErrPasswordCommon } // Simplified: full validation checks for uppercase, lowercase, number, special char var hasUpper, hasLower, hasNumber, hasSpecial bool for \_, char := range password { if unicode.IsUpper(char) { hasUpper = true } if unicode.IsLower(char) { hasLower = true } if unicode.IsNumber(char) { hasNumber = true } if unicode.IsSymbol(char) || unicode.IsPunct(char) { hasSpecial = true } } if !hasUpper || !hasLower || !hasNumber || !hasSpecial { return ErrPasswordTooWeak } return nil }

Password management services handle the hashing, comparison, and strength validation of user passwords. The [`PasswordService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/password.go#L48) in [`backend/internal/auth/password.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/password.go) uses [`bcrypt`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L96) for hashing, providing a computationally intensive algorithm to resist brute-force attacks.

To prevent username enumeration attacks, which could allow an attacker to determine valid usernames by observing response times, a constant-time comparison mechanism is implemented. The [`DummyCompare`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/password.go#L75) function compares a password against a pre-computed hash, ensuring that password verification for both existing and non-existent users takes approximately the same amount of time.

Password strength is enforced through validation rules that check for minimum length, the presence of common or weak password patterns, and the inclusion of various character types (uppercase, lowercase, numbers, special characters). Errors for validation failures, such as [`ErrPasswordTooShort`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/password.go#L17) or [`ErrPasswordTooWeak`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/password.go#L18), are explicitly defined to enable specific handling by calling functions.

### Multi-Factor Authentication (MFA) with TOTP and Recovery Codes

link

zoom\_in

The LastSaaS backend implements Time-based One-Time Password (TOTP) for multi-factor authentication (MFA) and provides robust recovery code functionality. The core logic resides within the [`TOTPService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/totp.go#L22), which manages the lifecycle of TOTP secrets and codes.

When a user enables MFA, the system generates a unique TOTP secret using a standard algorithm (30-second period, 6 digits, SHA1). This secret is securely stored, optionally encrypted with an AES-256 GCM key if the service is configured with an [`encryptionKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/totp.go#L23) during initialization. The system transparently handles both encrypted and plaintext secrets, ensuring backward compatibility.

For validation, the [`TOTPService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/totp.go#L22) verifies user-provided TOTP codes against the stored secret. This validation can account for minor clock drifts between the server and the user's authenticator app by using a configurable time window. This ensures that codes generated slightly before or after the exact 30-second interval are still accepted, improving user experience without compromising security.

In addition to TOTP, the system generates a set of unique recovery codes. These codes are random, base32-encoded strings. To enhance security, the system stores SHA256 hashed versions of these recovery codes, rather than the plaintext codes themselves. When a user needs to use a recovery code, the provided code is hashed, and this hash is compared against the stored hashed codes using a constant-time comparison to prevent timing attacks. This ensures that an attacker cannot deduce information about valid recovery codes based on the time it takes for the system to respond to an invalid code attempt.

The overall design ensures that MFA is both secure and resilient, offering users a reliable way to protect their accounts even if their primary authentication factor is compromised. The [`TOTPService`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/totp.go#L22) is designed to be reusable and handle multiple TOTP-related operations throughout its lifecycle.

### HTTP Middleware for Authentication and Authorization

link

zoom\_in

The LastSaaS backend utilizes a robust set of HTTP middleware components to enforce authentication and authorization policies across its API endpoints. These middleware functions are designed to intercept requests, validate credentials, verify user roles and tenant memberships, and control access based on defined entitlements.

Authentication is primarily handled by the [`AuthMiddleware`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/auth.go#L28) ([`backend/internal/middleware/auth.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/auth.go)), which supports both JSON Web Token (JWT) and API key-based methods. When a request includes an [`Authorization`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L12) header, this middleware determines the authentication scheme. For JWTs, it validates the token's signature and expiration, checks against a list of revoked tokens, and ensures the associated user account is active. If successful, user information is injected into the request context for subsequent handlers. For API keys, the middleware hashes the provided key, retrieves it from the database, confirms its active status, and associates it with the user who created it. For administrative API keys, it also resolves the root tenant and assigns appropriate membership roles.

Beyond authentication, several middleware components enforce authorization and access control:

-   **Role-Based Access Control (RBAC)**: The [`RequireRole`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/rbac.go#L9) middleware ([`backend/internal/middleware/rbac.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/rbac.go)) restricts access to API endpoints based on a user's assigned role within a tenant. It compares the user's role, retrieved from the request context, against a minimum required role for a given action.
-   **Root Tenant Restriction**: The [`RequireRootTenant`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/rbac.go#L26) middleware ([`backend/internal/middleware/rbac.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/rbac.go)) ensures that certain administrative endpoints are only accessible to requests originating from a designated root tenant.
-   **Tenant-Aware Processing**: The [`TenantMiddleware`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/tenant.go#L20) ([`backend/internal/middleware/tenant.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/tenant.go)) is crucial for multi-tenancy. It extracts the tenant ID from the [`X-Tenant-ID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L155) header, validates it, and retrieves the corresponding tenant and the user's membership details within that tenant. This information is then made available in the request context.
-   **Active Billing Enforcement**: The [`RequireActiveBilling`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/tenant.go#L92) middleware ([`backend/internal/middleware/tenant.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/tenant.go)) prevents access to features if a tenant's billing status is not active, with exemptions for root tenants or those with waived billing.
-   **Feature Entitlement Checks**: The [`RequireEntitlement`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/tenant.go#L120) middleware ([`backend/internal/middleware/tenant.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/middleware/tenant.go)) verifies if a tenant's subscription plan grants access to a specific feature. It checks the entitlements defined in the tenant's plan and denies access if the required feature is not present or is explicitly disabled.

These middleware components are designed to be chained, allowing for a layered approach to security where authentication occurs first, followed by tenant resolution, and then granular authorization checks based on roles, billing status, and feature entitlements. This structure ensures that every request is properly authenticated and authorized before reaching core application logic.

## Billing and Payments (Stripe Integration)

link

zoom\_in

The LastSaaS application integrates with Stripe to manage its billing and payment infrastructure. This integration encompasses customer and product synchronization, subscription lifecycle management, checkout processes, and secure handling of payment events through webhooks.

At its core, the Stripe integration is managed by a [`Service`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L28) defined in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go). This service is responsible for initializing the Stripe API with the necessary credentials and maintaining an [`instanceID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L32) for scenarios involving multiple application instances.

The system facilitates customer management by creating or retrieving Stripe customer IDs for each tenant, ensuring that tenant records in the database are updated accordingly. Products and their associated prices are managed and synchronized with Stripe, using a local database collection ([`models.StripeMapping`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L99)) to store and retrieve Stripe price identifiers. If a product or price does not exist in Stripe, the system can create it.

For purchasing, the system generates Stripe checkout sessions, supporting both subscriptions and one-time payments. These sessions can be customized with specific line items, trial periods, and metadata. The integration also allows tenants to access a Stripe Billing Portal session for managing their billing information directly.

Subscription management includes various operations such as initiating cancellations, either immediately or at the end of a billing period, and updating subscription quantities, particularly useful for per-seat billing models.

To maintain data consistency and react to payment-related events, the application securely processes Stripe webhooks. This involves verifying the webhook's signature to ensure authenticity before parsing the event payload and triggering subsequent internal actions.

Finally, the system includes a mechanism for generating unique, sequential internal invoice numbers, which are distinct from Stripe's own invoice IDs. These numbers are atomically incremented and formatted within the application's database.

### Stripe API Service Initialization and Configuration

link

go

content\_copyCopy

func New(secretKey, publishableKey, webhookSecret string, database \*db.MongoDB, frontendURL string) \*Service { // Set the global Stripe key for the entire application. stripe.Key = secretKey // Derive instance ID from the frontend URL hostname for multi-instance Stripe account sharing. instanceID := "" if u, err := url.Parse(frontendURL); err == nil && u.Hostname() != "" { instanceID = u.Hostname() } return &Service{ secretKey: secretKey, PublishableKey: publishableKey, webhookSecret: webhookSecret, instanceID: instanceID, // Used for multi-instance Stripe account sharing db: database, // Database client frontendURL: frontendURL, // Base URL for redirects } }

The Stripe service is initialized by the [`New`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L37) function within [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go). This process involves loading essential API credentials, specifically the Stripe [`secretKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L29), [`PublishableKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/config/config.go#L84), and [`webhookSecret`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L31). These keys are crucial for authenticating requests with Stripe and for securely processing incoming webhook events.

Additionally, the service manages an [`instanceID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L32), which is derived from the application's [`frontendURL`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/email/resend.go#L23). This identifier supports multi-instance deployments, allowing different instances of the application to be distinguished when interacting with Stripe, particularly in scenarios involving redirects or metadata tracking. The [`instanceID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L32) helps in associating Stripe-related activities with specific application deployments.

Upon initialization, the [`stripe.Key`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L38) is set globally for the Stripe Go client library, and the [`frontendURL`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/email/resend.go#L23) is parsed to extract the [`instanceID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L32), ensuring that the Stripe service is correctly configured and prepared for API interactions.

### Customer and Product/Price Synchronization

link

zoom\_in

The Stripe service manages the synchronization of customer, product, and pricing data between the application's database and the Stripe platform.

For customer management, the application associates each internal tenant with a Stripe customer ID. The [`GetOrCreateCustomer`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L60) function in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go) ensures that a corresponding Stripe customer exists for a given [`models.Tenant`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L232). If the tenant does not yet have a [`StripeCustomerID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/tenant.go#L19) recorded internally, a new customer is created in Stripe, and this ID is then persisted in the tenant's database record. This linkage is crucial for all subsequent billing and subscription operations.

Product and price synchronization is handled by the [`GetOrCreatePrice`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L94) function within [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go). This function first consults a local [`models.StripeMapping`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L99) collection in the database to determine if a specific product or plan already has an associated [`StripePriceID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/billing.go#L56). If a mapping exists, the existing Stripe price ID is retrieved. If not, the system proceeds to create a new [`Product`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L208) in Stripe, followed by the creation of a [`Price`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L78) linked to this new product. The newly established mapping between the internal product/plan and its Stripe price ID is then stored in the local [`models.StripeMapping`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L99) collection for future reference. This mechanism supports consistent pricing across the platform and abstracts the complexities of Stripe's product catalog for internal application logic.

### Subscription Lifecycle Management

link

zoom\_in

The LastSaaS backend manages Stripe subscriptions through a dedicated service, providing functionalities for creating new subscriptions, altering existing ones, and handling their cancellation.

The [`CreateCheckoutSession`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L183) function in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go) initiates the subscription process by generating Stripe checkout sessions. These sessions guide users through the payment process, supporting both new subscriptions and one-time payments. The system dynamically constructs [`lineItems`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L209) for the checkout session, either from custom line items provided in a request or by retrieving or creating a product price using [`GetOrCreatePrice`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L94). It configures success and cancellation URLs, and can include metadata such as the [`instanceID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L32) for multi-tenant tracking.

Once a subscription is active, its lifecycle can be managed in several ways:

-   **Cancellation at Period End**: The [`CancelSubscriptionAtPeriodEnd`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L306) function in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go) allows for scheduling a subscription to be cancelled when its current billing period concludes. This ensures that users retain access to the service until the end of their paid term.
-   **Immediate Cancellation**: For immediate termination, [`CancelSubscriptionImmediately`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L330) in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go) cancels a subscription right away.
-   **Quantity Updates**: For usage-based or seat-based billing, the [`UpdateSubscriptionQuantity`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L374) function in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go) adjusts the quantity of a subscription item. This operation typically includes proration to correctly account for billing changes.

The system also allows for retrieving specific subscription details using [`GetSubscription`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L406) in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go), which fetches the Stripe [`Subscription`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L750) object and expands its associated items. Additionally, users can access their billing information directly through Stripe's customer portal, with the system providing a function [`CreateBillingPortalSession`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L292) in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go) to generate the necessary redirect URL.

For more information on the overall Stripe integration, refer to [Billing and Payments (Stripe Integration)](https://codewiki.google/github.com/jonradoff/lastsaas#billing-and-payments-stripe-integration).

### Secure Webhook Handling and Event Processing

link

zoom\_in

The LastSaaS backend integrates with Stripe to securely process webhooks, which are critical for updating the application's internal state in response to events from Stripe, such as payment confirmations or subscription changes. This integration ensures data consistency between Stripe and the LastSaaS system.

The core of this secure processing is the [`ConstructEvent`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L340) method, found within the Stripe service in [`backend/internal/stripe/stripe.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go). This method is invoked when a webhook notification arrives from Stripe. Its primary function is to verify the authenticity and integrity of the incoming payload. It achieves this by using a [`webhookSecret`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L31) to validate the signature included in the webhook request. If the signature verification fails, the event is immediately rejected, safeguarding the system from spoofed or tampered requests.

Once an event is authenticated, its payload is parsed into a structured Stripe event object. This object encapsulates the event type and relevant data, such as details about a successful payment or a subscription update. The application then uses this information to trigger internal actions and update its MongoDB database. This synchronization ensures that the application's records, including customer billing details and subscription statuses, accurately reflect the current state in Stripe.

### Internal Invoice Number Generation

link

go

content\_copyCopy

func (s \*Service) NextInvoiceNumber(ctx context.Context) (string, error) { var result models.InvoiceCounter // Defines a struct to hold the counter value opts := options.FindOneAndUpdate(). SetUpsert(true). // Create the document if it doesn't exist SetReturnDocument(options.After) // Return the document after the update // Atomically increments the 'value' field of the invoice\_number document err := s.db.Counters().FindOneAndUpdate(ctx, bson.M{"\_id": "invoice\_number"}, bson.M{"$inc": bson.M{"value": 1}}, // Increment the value by 1 opts, ).Decode(&result) if err != nil { return "", fmt.Errorf("generate invoice number: %w", err) } // Formats the incremented value into a string like "INV-000001" return fmt.Sprintf("INV-%06d", result.Value), nil }

The system generates sequential and formatted internal invoice numbers that are distinct from Stripe's own invoice IDs. This functionality is provided by the [`NextInvoiceNumber`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L347) method within the Stripe integration service, which atomically increments a counter stored in the MongoDB [`Counters`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L409) collection. The invoice numbers are formatted as "INV-XXXXXX". This mechanism ensures consistent, unique internal invoicing regardless of Stripe's invoice numbering.

## Webhooks and External Integrations

link

zoom\_in

The system dispatches webhooks for various events and integrates with an email sending service for notifications. The webhook dispatcher, located in [`backend/internal/webhooks`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks), listens for internal system events and triggers configured webhooks. This includes generating JSON payloads, HMAC signing for authenticity, and recording delivery attempts and outcomes. For secure data transfer, the system employs AES-256-GCM encryption and decryption for webhook secrets, along with HMAC-SHA256 signature generation to ensure the integrity and origin of webhook payloads. To ensure reliability, failed webhook deliveries are retried with an exponential backoff mechanism.

The email sending service, implemented in [`backend/internal/email`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/email), integrates with the Resend API. This service supports various email types such as verification, password reset, magic links, and invitations. It processes templates for email content and incorporates retry logic to handle transient delivery issues, ensuring reliable communication.

### Webhook Dispatch and Retry Mechanisms

link

zoom\_in

The system incorporates a robust webhook dispatch mechanism, which translates internal application events into external webhook notifications. This process involves a [`Dispatcher`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L34) component, primarily defined in [`backend/internal/webhooks/dispatcher.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go), that listens for various [`events.EventType`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L137) values within the application. Upon detecting a relevant event, [`mapEventType`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L138) within [`backend/internal/webhooks/dispatcher.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go) translates it into a [`models.WebhookEventType`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/testutil/testutil.go#L423) to identify appropriate webhook subscriptions.

The dispatcher constructs an HTTP POST request with a JSON payload containing the event data. To ensure the authenticity and integrity of these notifications, an [`X-Webhook-Signature`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/APIPage.tsx#L881) header is included. This signature is an HMAC-SHA256 hex digest of the payload, computed using a secret associated with the webhook, as implemented by [`computeSignature`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L329) in [`backend/internal/webhooks/dispatcher.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go). Webhook secrets can be stored encrypted, with [`resolveSecret`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L312) in the same file handling their decryption using an [`encryptionKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/totp.go#L23) to protect sensitive information during storage. More details on the encryption and decryption processes can be found in [Secure Webhook Secret Management and Cryptography](https://codewiki.google/github.com/jonradoff/lastsaas#webhooks-and-external-integrations-secure-webhook-secret-management-and-cryptography).

To enhance reliability, the system employs a retry mechanism for failed webhook deliveries. If an initial delivery attempt results in a non-2xx HTTP status code or an error, the [`deliverWithRetry`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L225) function in [`backend/internal/webhooks/dispatcher.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go) schedules the event for retry. This retry process utilizes an exponential backoff strategy, meaning that the delay between retry attempts increases progressively. A dedicated [`retryWorker`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L75) goroutine monitors a queue of failed deliveries ([`retryQ`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L37)) and re-attempts them according to their scheduled times, ensuring that transient network issues or temporary receiver unavailability do not lead to lost notifications. The system also limits the number of concurrent retry attempts to prevent resource exhaustion.

### Secure Webhook Secret Management and Cryptography

link

zoom\_in

To ensure the integrity and confidentiality of webhook communications, the system employs cryptographic operations for secret management and payload authentication. This involves encrypting webhook secrets at rest using AES-256-GCM, generating HMAC-SHA256 signatures for outgoing payloads, and carefully parsing encryption keys.

The [`Dispatcher`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L34) responsible for webhook delivery ([`backend/internal/webhooks/dispatcher.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go)) integrates these cryptographic measures. Webhook secrets, which are sensitive credentials, are not stored in plaintext. Instead, they are encrypted using AES-256-GCM, a robust authenticated encryption algorithm. When a secret is needed for signing a webhook payload, the [`resolveSecret`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L312) function decrypts it using an [`encryptionKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/totp.go#L23) configured in the [`Dispatcher`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L34). If no [`encryptionKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/totp.go#L23) is set, or if decryption fails (e.g., due to a legacy plaintext secret), the system gracefully falls back to treating the stored value as plaintext.

For every outgoing webhook request, a [`X-Webhook-Signature`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/APIPage.tsx#L881) header is included, containing an HMAC-SHA256 signature of the payload. This signature, computed by the [`computeSignature`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/dispatcher.go#L329) function, allows the receiving endpoint to verify the authenticity and integrity of the webhook, ensuring that the payload has not been tampered with and originated from a trusted source. The signature is generated using the (decrypted) webhook secret as the key.

Encryption keys themselves are managed and parsed carefully. The [`ParseEncryptionKey`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/crypto.go#L76) function ([`backend/internal/webhooks/crypto.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/webhooks/crypto.go)) converts a 64-character hexadecimal string into the necessary 32-byte key for AES-256-GCM operations. An empty string for the hexadecimal key indicates that encryption is not in use for secrets.

### Email Sending Service with Resend API

link

zoom\_in

The email sending service integrates with the Resend API to handle various system notifications and communications. This service is designed to reliably dispatch emails for critical user flows such as email verification, password resets, magic link authentications, and tenant invitations.

The core of the service is responsible for sending emails to the Resend API. This functionality includes a retry mechanism with exponential backoff to manage transient network issues or API errors, ensuring that emails are eventually delivered even if initial attempts fail. On successful delivery, the system tracks the number of emails sent through the API.

Email content is dynamically generated using templates. The service retrieves specific HTML email templates, falling back to default content if a custom template is not available. This templating system allows for consistent branding and messaging across different email types. Each specialized email function prepares specific data—such as verification URLs, reset URLs, magic links, or invitation details—and uses these templates to construct the subject and body of the email before sending it.

## System Administration and CLI Tools

link

Command/Subcommand

Primary Function

Description

`setup`

System Initialization

Initializes the LastSaaS system, creating a root tenant and an owner account.

`start`/`stop`/`restart`

Server Management

Controls the backend and frontend servers (builds, starts, stops, or restarts them).

`version`

Version Information

Displays the current binary and database versions.

`status`

System Overview

Provides a quick check of environment, config, MongoDB connection, and initialization status.

`doctor`

System Diagnostics

Runs comprehensive checks on configuration, database connection, system initialization, and integrations.

`logs`

Log Management

Views and filters system logs by severity, category, and time range, with a follow mode for real-time updates.

`users`

User Administration

Manages user accounts, including listing, viewing details, suspending, activating, and revoking sessions.

`tenants`

Tenant Administration

Manages tenant accounts, including listing and viewing detailed information for each tenant.

`health`

System Health Monitoring

Shows real-time system health metrics (CPU, memory, disk, HTTP, MongoDB connections) and node status.

`stats`

Dashboard Statistics

Provides a summary of key dashboard statistics like user/tenant counts, active subscriptions, and financial metrics.

`financial`

Financial Reporting

Offers various financial insights: `summary` of revenue and metrics, lists `transactions`, and shows daily `metrics`.

`config`

Configuration Management

Allows listing, getting, setting, and resetting system configuration variables stored in the database.

`db stats`

Database Statistics

Displays document counts and sizes for all database collections.

`mcp`

AI Assistant Integration

Starts the MCP server to integrate with AI assistants for administrative tasks via API calls.

The LastSaaS system provides a command-line interface (CLI) application for administrative tasks, located in [`backend/cmd/lastsaas`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas). This tool is used for system setup, monitoring, configuration management, and user and tenant administration. It includes functionalities for database management, displaying system health metrics, viewing logs, managing server processes, and performing various user and tenant-related operations. The CLI supports both human-readable and JSON output formats, which is useful for integration with other scripting tools.

One core function of the CLI is [`cmdDB`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_db.go#L13), which provides database statistics from MongoDB, including overall database size and per-collection document counts and sizes.

The [`cmdDoctor`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go#L17) function within the CLI executes comprehensive diagnostic checks on the application's environment and configuration. It verifies configuration file loading, MongoDB connectivity, system initialization status, version compatibility, and the integrity of JWT secrets. It also performs checks on integrated services like Stripe and email, OAuth provider configurations, root tenant ownership, and the active status of server nodes. For details on how the system's overall health and metrics are managed, see [System Health and Monitoring](https://codewiki.google/github.com/jonradoff/lastsaas#system-health-and-monitoring).

For log management, the [`cmdLogs`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_logs.go#L18) functionality allows administrators to view and filter system logs from the MongoDB database. Logs can be filtered by severity, category, and search terms, and the tool supports a "follow" mode for real-time log streaming.

The CLI also provides [`start`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L63), [`stop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L81), and [`restart`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L239) commands for managing the lifecycle of the backend ([`lastsaas-server`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/.dockerignore#L11)) and frontend ([`vite`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/README.md?plain=1#L1)) processes. These commands handle process detachment, PID file management, and graceful shutdowns.

Beyond these administrative functions, the CLI acts as a client for a Multi-Cloud Platform (MCP) by exposing various read-only LastSaaS administrative API functionalities. This includes tools for accessing information about the application, dashboard data, tenant and user details, financial reports, and system health. For financial reporting, the CLI offers [`cmdFinancialSummary`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L41) for revenue and subscription metrics, [`cmdFinancialTransactions`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L192) for detailed transaction listings, and [`cmdFinancialMetrics`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L314) for viewing daily business metric trends, all aggregated from MongoDB data. For further details on how daily metrics are collected, refer to [Daily Metrics Collection with Distributed Leader Election](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-daily-metrics-collection-with-distributed-leader-election).

Configuration variables are managed via the [`cmdConfig`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L529) command, which allows administrators to list, get, set, and reset system-wide configuration variables stored in [`models.ConfigVar`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L582) within the database. This includes validation of new values and the ability to revert to system defaults. The backend's approach to configuration is further described in [Configuration Management and Dynamic Reloading](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-configuration-management-and-dynamic-reloading).

User and tenant administration is also supported, with commands to list and retrieve details for users and tenants, suspend or activate user accounts, and revoke user sessions.

### Comprehensive System Diagnostics with `cmdDoctor`

link

zoom\_in

The [`cmdDoctor`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go#L17) function, located in [`backend/cmd/lastsaas/cmd_doctor.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go), performs a series of comprehensive checks to ascertain the health and correct configuration of the LastSaaS application. This diagnostic tool provides [`PASS`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go#L28), [`WARN`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/datadog/client.go#L88), or [`FAIL`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/output.go#L76) statuses for various components, offering a quick overview of the system's operational readiness.

The diagnostic process begins by verifying fundamental aspects of the application. It first attempts to load the core application configuration from [`config.Load`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L95) to ensure all necessary settings are accessible. Following this, it establishes a connection to the MongoDB database using [`db.NewMongoDB`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L103) to confirm database availability and proper connectivity. If either of these initial steps fails, the diagnostic process halts, as these are critical dependencies for the application's operation.

Once basic connectivity is established, [`cmdDoctor`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go#L17) proceeds with more detailed checks. It queries the [`SystemConfig`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/system.go#L9) collection in MongoDB to determine if the system has been initialized, issuing a warning if the setup process appears incomplete. It also compares the currently running binary's version ([`version.Current`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L157)) against the version recorded in the database ([`sys.Version`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L870)), flagging any discrepancies that might indicate a need for database migrations or a mismatch between deployed components.

Security-related configurations are also thoroughly examined. The function checks for the presence of essential JSON Web Token (JWT) secrets, specifically [`cfg.JWT.AccessSecret`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L168) and [`cfg.JWT.RefreshSecret`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L169), which are vital for user authentication and session management.

Integration settings for external services are verified to ensure that third-party functionalities are correctly configured. This includes checking for [`Stripe`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/config/config.go#L22) and [`Email (Resend)`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go#L83) API keys using [`checkConfigIntegration`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go#L130), indicating whether the billing and notification systems are ready for use. For OAuth providers like [`Google`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L25) and [`GitHub`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L25), [`cmdDoctor`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go#L17) verifies the presence of client IDs and secrets, providing warnings if a provider is partially configured.

Finally, the diagnostic process inspects the application's operational state within the database. It confirms the existence of a root tenant and verifies that an "owner" role is assigned, which is fundamental for administrative control. It also checks [`database.SystemNodes`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_doctor.go#L110) for active server nodes, identifying whether any instances of the application backend are currently reporting their status. A warning is issued if no active nodes are detected, indicating a potential operational issue.

The command-line interface for these diagnostics is designed to provide clear, color-coded output, making it easy to identify the status of each component. This approach helps administrators quickly pinpoint areas that require attention, streamline troubleshooting, and ensure the application operates in a stable and secure environment. For more details on the command-line interface, refer to [System Administration and CLI Tools](https://codewiki.google/github.com/jonradoff/lastsaas#system-administration-and-cli-tools).

### Advanced Log Management and Real-time Streaming

link

go

content\_copyCopy

func cmdLogs() { fs := flag.NewFlagSet("logs", flag.ExitOnError) severity := fs.String("severity", "", "Filter by severity (comma-separated)") category := fs.String("category", "", "Filter by category") search := fs.String("search", "", "Full-text search") tail := fs.Int("tail", 50, "Number of recent entries to show") follow := fs.Bool("follow", false, "Follow mode: continuously poll for new entries") from := fs.String("from", "", "Start date (RFC3339 or relative: 1h, 24h, 7d)") // ... other flag definitions fs.Parse(os.Args\[2:\]) // connectDB and cleanup stubbed for brevity database, \_, cleanup := connectDB() defer cleanup() filter := buildLogFilter(\*severity, \*category, \*search, \*from, \*to) // Constructs MongoDB query limit := int64(\*tail) ctx := context.Background() if \*follow { logsFollow(ctx, database, filter, limit) // Handles continuous polling return } logs := queryLogs(ctx, database, filter, limit) // Fetches logs from DB if jsonOutput { printJSON(logs) // Outputs raw JSON if --json global flag is set return } for \_, log := range logs { printLogEntry(log) // Formats and prints color-coded log entry } fmt.Printf("\\n%s %d entries shown\\n", clr(cGray, "---"), len(logs)) } func printLogEntry(log models.SystemLog) { // ... formatting logic for terminal output, includes severityClr, clr for colors }

The [`cmdLogs`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_logs.go#L18) functionality, located in [`backend/cmd/lastsaas/cmd_logs.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_logs.go), offers advanced capabilities for viewing and filtering system logs. This includes the ability to query logs based on various criteria such as severity, category, and specific search terms. The system provides the flexibility to specify multiple severities, for instance, to view both warnings and errors.

A key feature is the [`follow`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L672) mode, which allows for real-time log streaming. When activated, the system initially displays a batch of recent logs and then continuously monitors the database for new entries, printing them as they occur. This is particularly useful for live debugging and monitoring active system behavior.

Log entries are presented in a formatted, color-coded display when output to a terminal, enhancing readability and quick identification of critical events. This formatting includes color-coding based on log severity and other contextual elements. For integration with other tools, a JSON output option is also available.

The log querying mechanism, managed by [`buildLogFilter`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_logs.go#L63) in [`backend/cmd/lastsaas/cmd_logs.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_logs.go), supports time-based filtering, allowing users to retrieve logs from specific timeframes, including relative durations like "1 hour ago" or "7 days ago". All log data is stored and retrieved from a MongoDB database, as detailed in [Database Connectivity and Schema Management](https://codewiki.google/github.com/jonradoff/lastsaas#backend-server-architecture-database-connectivity-and-schema-management).

### Process Management for Backend and Frontend Services

link

zoom\_in

The LastSaaS CLI provides commands to manage the lifecycle of the [`lastsaas-server`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/.dockerignore#L11) backend and the [`vite`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/README.md?plain=1#L1) frontend development server. These commands include [`start`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L63), [`stop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L81), and [`restart`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L239), which allow administrators to control these services.

When a service is started, the CLI ensures it runs in a detached process, separate from the terminal session that initiated it. This allows the services to continue running even if the terminal is closed. The process ID (PID) of each running service is recorded in a dedicated PID file, typically located in a [`.pids`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/.dockerignore#L7) directory within the project root. This file acts as a reference for subsequent [`stop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L81) and [`restart`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L239) commands. Output from the services' standard output and standard error streams is redirected to log files for debugging and monitoring. The system also performs a quick check after starting a service to detect immediate startup failures.

To stop a running service, the CLI reads its PID from the corresponding PID file and sends a [`SIGTERM`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L829) signal to the process group. This initiates a graceful shutdown, allowing the service to clean up resources before terminating. If the service does not terminate within a specified timeout, a more forceful [`SIGKILL`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/process.go#L233) signal is issued. The [`restart`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L239) command combines these operations by first stopping the services and then starting them again after a brief pause to ensure full termination. This process management is facilitated by the code in [`backend/cmd/lastsaas/process.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/process.go), with the overall CLI logic managed in [`backend/cmd/lastsaas/main.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go).

### Multi-Cloud Platform (MCP) Integration for Administrative APIs

link

zoom\_in

The LastSaaS command-line interface (CLI) operates as an MCP (Multi-Cloud Platform) client, designed to expose specific administrative functionalities of the LastSaaS backend to an MCP server. This integration facilitates remote monitoring and management of the LastSaaS system through a unified platform. The CLI achieves this by registering various [`NewTool`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_mcp.go#L144) and [`NewResource`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_mcp.go#L853) definitions, which correspond to read-only API endpoints within the LastSaaS application.

The core mechanism involves an [`mcpClient`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_mcp.go#L24) which manages authenticated HTTP requests to the LastSaaS API using environment variables such as [`LASTSAAS_URL`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L566) and [`LASTSAAS_API_KEY`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L567). This client ensures that all interactions are secure and properly authorized. For example, administrative details about the system, current dashboard metrics, tenant information, and user data are made available as distinct tools or resources. When an MCP server requests information, the CLI client fetches the data from the corresponding LastSaaS API endpoint and formats the JSON response for the MCP server. This modular approach allows the MCP to access and display key administrative data without directly interacting with the LastSaaS backend. The [`cmdMCP`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_mcp.go#L93) function in [`backend/cmd/lastsaas/cmd_mcp.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_mcp.go) orchestrates this registration process, defining how each administrative function, such as fetching system health or user lists, maps to an MCP tool.

### Financial Reporting and Metrics Aggregation

link

zoom\_in

The LastSaaS command-line interface provides financial reporting capabilities, allowing administrators to gain insights into the application's revenue, subscriptions, and daily business metrics. These functionalities are accessed through command-line subcommands defined in [`backend/cmd/lastsaas/cmd_financial.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go).

The [`cmdFinancialSummary`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L41) command provides a comprehensive overview of financial performance. It calculates total revenue, refunds, and a breakdown of revenue by transaction type. It also reports the number of active subscriptions, the latest Annual Recurring Revenue (ARR), and revenue generated over the last 30 days. This aggregation of data is achieved by executing various MongoDB aggregation pipelines against the financial transaction records.

For more granular detail, the [`cmdFinancialTransactions`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L192) command allows for listing individual financial transactions. This command supports filtering by parameters such as transaction limit, type, date range, and tenant ID, enabling targeted analysis of financial events. Time-based filters, for example, can interpret relative dates like "7d" for "last 7 days".

Finally, the [`cmdFinancialMetrics`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L314) command presents daily business metrics. This command retrieves trends in metrics such as Daily Active Users (DAU), Weekly Active Users (WAU), Monthly Active Users (MAU), and ARR over a specified number of days, providing a historical view of key performance indicators. The data for these metrics is sourced from aggregated daily metric records stored in MongoDB.

All financial reporting commands interact with a MongoDB database, utilizing [`context.WithTimeout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L109) to ensure operations complete within a defined timeframe and [`defer`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/server/main.go#L108) statements to manage database connection cleanup. The output can be presented in a human-readable table format or as JSON, making it suitable for both direct consumption and integration with other tools. For a broader view of system statistics, refer to [Comprehensive System Diagnostics with `cmdDoctor`](https://codewiki.google/github.com/jonradoff/lastsaas#system-administration-and-cli-tools-comprehensive-system-diagnostics-with-cmddoctor).

### Configuration Variable Management with `cmdConfig`

link

go

content\_copyCopy

func cmdConfig() { // ... (flag parsing and subcommand routing) switch os.Args\[2\] { case "list": cmdConfigList() case "get": // ... (argument validation) cmdConfigGet(os.Args\[3\]) // ... (set and reset cases) } } func cmdConfigList() { database, \_, cleanup := connectDB() // Establishes DB connection defer cleanup() ctx, cancel := context.WithTimeout(context.Background(), 10\*time.Second) defer cancel() cursor, err := database.ConfigVars().Find(ctx, bson.M{}) // ... (error handling) defer cursor.Close(ctx) var vars \[\]models.ConfigVar if err := cursor.All(ctx, &vars); err != nil { // ... (error handling) } // Simplified output for snippet fmt.Println("Listing all configuration variables:") for \_, v := range vars { fmt.Printf(" %s (Type: %s, Value: %s)\\n", v.Name, v.Type, v.Value) } } func cmdConfigGet(name string) { database, \_, cleanup := connectDB() // Establishes DB connection defer cleanup() ctx, cancel := context.WithTimeout(context.Background(), 10\*time.Second) defer cancel() var v models.ConfigVar err := database.ConfigVars().FindOne(ctx, bson.M{"name": name}).Decode(&v) if err != nil { fmt.Fprintf(os.Stderr, "Config variable not found: %s\\n", name) os.Exit(1) } fmt.Printf("Details for configuration variable '%s':\\n", v.Name) fmt.Printf(" Description: %s\\n", v.Description) fmt.Printf(" Type: %s\\n", v.Type) fmt.Printf(" Value: %s\\n", v.Value) }

The [`cmdConfig`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L529) command within the LastSaaS CLI provides administrators with tools to manage system configuration variables. These variables, represented by [`models.ConfigVar`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L582), allow for dynamic adjustments to the application's behavior without requiring code changes or redeployments.

Administrators can perform several operations using [`cmdConfig`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L529):

-   [`list`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L106): This subcommand retrieves and displays all configured system variables. Depending on the output preference, these can be shown in a human-readable table or as a JSON array.
-   [`get`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/configstore/store.go#L56): To inspect a specific configuration variable, administrators can use the [`get`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/configstore/store.go#L56) subcommand, specifying the variable's name. This provides detailed information about that particular setting.
-   [`set`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/configstore/store.go#L88): The [`set`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/configstore/store.go#L88) subcommand allows administrators to modify the value of a configuration variable. Before applying the change, the system performs validation to ensure the new value adheres to the variable's defined type and constraints. This validation process helps maintain data integrity and prevent misconfigurations.
-   [`reset`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L104): For configuration variables that have a predefined default value, the [`reset`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L104) subcommand can revert a variable to its original system default. This is useful for undoing custom changes or restoring recommended settings.

The management of these configuration variables is handled through [`database.ConfigVars`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L575) and leverages [`configstore.ValidateValue`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L659) for value integrity checks, and [`configstore.SystemDefaults`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/main.go#L681) for reverting to predefined settings. This functionality is crucial for maintaining the system's operational flexibility and stability. Further details on the overall administrative CLI tools can be found in [System Administration and CLI Tools](https://codewiki.google/github.com/jonradoff/lastsaas#system-administration-and-cli-tools).

## System Health and Monitoring

link

zoom\_in

LastSaaS includes a comprehensive health monitoring system that registers and tracks individual application nodes, collects detailed system and application metrics, and performs health checks for integrated third-party services.

The health monitoring [`Service`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L28) is responsible for managing the lifecycle of system nodes. Each running instance of the LastSaaS backend registers itself as a node and periodically sends a heartbeat to update its status and [`lastSeen`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L331) timestamp in MongoDB. This mechanism ensures that the system maintains an up-to-date view of active and inactive nodes.

A dedicated collector routine gathers a wide array of metrics from each node. These include system-level metrics such as CPU usage, memory utilization, disk I/O, and network activity. Application-specific metrics are also collected, covering HTTP request statistics (counts, latency, error rates), MongoDB [`serverStatus`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L309) and [`dbStats`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_db.go#L39), and Go runtime metrics (heap, goroutines, garbage collection). Additionally, the system tracks API call counts for external integrations like Stripe, Resend, and DataDog. All collected metrics are stored in MongoDB as [`models.SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L44) documents, providing a historical record of system performance.

Beyond internal metrics, the health monitoring system also integrates with external services to perform health checks. This involves registering specific [`IntegrationChecker`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/integrations.go#L24) functions for various third-party services, such as MongoDB, Stripe, Resend, Google OAuth, GitHub OAuth, Microsoft OAuth, and DataDog. These checkers periodically verify the operational status of external dependencies. For example, the Stripe checker might call the Stripe API to confirm connectivity, while the Resend checker might query its domain API. The results of these integration checks, including their status (healthy, unhealthy, or not configured), a descriptive message, and the response time, are maintained by the service.

The system provides various functionalities to query this health data, enabling administrators to retrieve lists of registered nodes, historical and current system metrics, and aggregated integration usage counts. For instance, nodes that have not sent a heartbeat within a configurable timeout are automatically marked as [`models.NodeStatusStale`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L26) (see [`backend/internal/health/query.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go)). The aggregation capabilities allow for insights into trends, such as summing [`stripeApiCalls`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L386) and [`resendEmails`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L387) over the last 24 hours.

### Node Management and Heartbeat Mechanisms

link

zoom\_in

System health monitoring within LastSaaS relies on a node management system that tracks the status and activity of individual server instances. This system registers each [`lastsaas-server`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/.dockerignore#L11) instance as a [`models.SystemNode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L16) in MongoDB upon startup. Each node is identified by a unique [`nodeID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L32), typically derived from environment variables like [`FLY_MACHINE_ID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L48) or the system's hostname.

A critical component of this management is the [`heartbeatLoop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L96), a goroutine that runs periodically within the [`health`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/admin.go#L35) service. Its primary responsibility is to update the [`lastSeen`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L331) timestamp and [`status`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L22) of the current node in the [`SystemNodes`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L393) collection in MongoDB. This periodic update acts as a heartbeat, signaling that the node is active and operational. If a node's [`lastSeen`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L331) timestamp exceeds a defined [`stale_timeout_seconds`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L17) threshold (configurable via [`health.node.stale_timeout_seconds`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L17)), it is automatically marked with [`models.NodeStatusStale`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L26) by the [`ListNodes`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L16) function, indicating potential inactivity.

The lifecycle of these routines is managed by [`Start`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L63) and [`Stop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L81) methods within the health service, which initiate and gracefully terminate the background goroutines, ensuring a controlled startup and shutdown of node tracking. For further details on how the system's overall health is assessed, refer to [Integration Health Checks and Third-Party Monitoring](https://codewiki.google/github.com/jonradoff/lastsaas#system-health-and-monitoring-integration-health-checks-and-third-party-monitoring).

### Detailed System Metric Collection

link

zoom\_in

The system continuously gathers a comprehensive set of operational metrics to provide insights into the application's health and performance. This collection process, primarily managed by the [`collectorLoop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L171) function within [`backend/internal/health/health.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go), runs periodically, capturing various data points and storing them as [`models.SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L44) documents in MongoDB.

The metrics gathered cover several key areas:

-   **CPU and Memory**: Information on CPU usage percentage and core count, as well as virtual memory statistics including used, total, and percentage.
-   **Disk and Network I/O**: Usage statistics for the root disk partition and network input/output counters (bytes sent and received).
-   **HTTP Request Statistics**: Data on HTTP request counts, latency percentiles (P50, P95, P99), status code distributions, and error rates (4xx, 5xx), sourced from a [`middleware.MetricsCollector`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L30).
-   **MongoDB Performance**: Metrics obtained from MongoDB's [`serverStatus`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L309) (e.g., connection counts, operation counters) and [`dbStats`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_db.go#L39) (e.g., data size, index size).
-   **Go Runtime Metrics**: Details about the Go runtime, including heap allocations, system memory usage, number of goroutines, and garbage collection pause times.
-   **Integration API Call Counts**: Tallies of calls made to external services such as Stripe, Resend, and DataDog, managed by atomic counters in [`backend/internal/apicounter/counter.go`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/apicounter/counter.go). These counters are reset after each collection cycle.

All collected metrics are encapsulated into [`models.SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L44) structures and persisted in the [`SystemMetrics`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/db/mongodb.go#L397) collection within MongoDB. This structured storage facilitates historical analysis and real-time monitoring through various query functions. For more information on how these metrics are queried and displayed, see [Querying System Health Data](https://codewiki.google/github.com/jonradoff/lastsaas#system-health-and-monitoring-querying-system-health-data). Additionally, registered callbacks can be triggered after each health snapshot, allowing external components to react to health updates. The system's robustness is maintained through panic recovery mechanisms, ensuring that the metric collection process continues even if individual metric gathering encounters an issue.

### Integration Health Checks and Third-Party Monitoring

link

zoom\_in

The LastSaaS backend incorporates a framework for monitoring the health of various third-party service integrations. This framework allows for the registration of specific health check functions for services such as MongoDB, Stripe, Resend, DataDog, and OAuth providers (Google, GitHub, Microsoft), as well as internal features like WebAuthn and SAML.

The [`Service`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/stripe/stripe.go#L28) includes methods to register these [`IntegrationChecker`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/integrations.go#L24) functions, which are responsible for executing a health check against their respective external services and returning an error if a problem is detected. Once registered, the [`integrationCheckLoop`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/integrations.go#L74) periodically executes these checks, typically every 5 minutes. Each check runs with a timeout to prevent any single integration from blocking the entire health monitoring process. The results of these checks, including the status (healthy, unhealthy, or not configured), a message, the last check timestamp, and the response time, are stored internally.

The system provides mechanisms to retrieve the current health status of all registered integrations. This allows for a quick assessment of the operational state of external dependencies, which is critical for maintaining application reliability and diagnosing issues. The overall health of the integrations can be queried to determine if any configured service is currently unhealthy.

### Querying System Health Data

link

Function

Data Type

Description

`ListNodes`

Nodes

Returns all system nodes, marking nodes as "stale" if their `lastSeen` timestamp exceeds a configured threshold (defaulting to 180 seconds).

`GetMetrics`

Metrics

Retrieves system metrics for a specific node (`nodeID`) within a defined `from` and `to` time range.

`GetAggregateMetrics`

Metrics

Retrieves system metrics across all nodes within a defined `from` and `to` time range.

`GetCurrentMetrics`

Metrics

Returns the most recent system metric recorded for each active node.

`GetIntegrationCounts24h`

Integration Counts

Returns the total count of Stripe API calls and Resend emails performed across all nodes within the last 24 hours.

The system provides several functionalities for retrieving and analyzing health-related data. All health data is stored in MongoDB, allowing for flexible querying and aggregation.

Node information can be retrieved using [`ListNodes`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L16), which lists all registered [`SystemNode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L18) entries. This function also identifies and marks nodes as stale if their [`lastSeen`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L331) timestamp exceeds a configured timeout.

Detailed system metrics, encapsulated as [`SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L30) objects, can be accessed through various functions. [`GetMetrics`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L44) retrieves historical metric data for a specific node within a given time range. To view metrics across all nodes, [`GetAggregateMetrics`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L64) fetches all [`SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L30) entries within a specified period. For immediate insights, [`GetCurrentMetrics`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L83) provides the most recent [`SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L30) for each active node.

Additionally, the system can aggregate API call counts from integrations. [`GetIntegrationCounts24h`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/query.go#L104) calculates the total number of Stripe API calls and Resend emails recorded over the last 24 hours by performing a MongoDB aggregation on stored metrics.

## Frontend Application Structure

link

zoom\_in

The React frontend application, located in [`frontend`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend), provides a user interface for the multi-tenant SaaS platform. It leverages [`react-router-dom`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/App.tsx#L2) for navigation and [`react-query`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/App.tsx#L3) for data fetching and state management. The application's architecture is designed around several key principles to handle authentication, dynamic branding, multi-tenancy, and consistent UI theming.

The main entry point for the application is [`frontend/src/main.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/main.tsx), which renders the root [`App`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/config/config.go#L21) component. This [`App`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/config/config.go#L21) component acts as the central orchestrator, setting up routing and integrating various global state management contexts.

Global state management is handled through React Contexts, ensuring critical information is consistently available throughout the application. The [`AuthContext`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/AuthContext.tsx#L24), implemented in [`frontend/src/contexts/AuthContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/AuthContext.tsx), manages user authentication status, user data, memberships, and provides functions for logging in, registering, and handling multi-factor authentication (MFA). The [`BrandingContext`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/BrandingContext.tsx#L40), located in [`frontend/src/contexts/BrandingContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/BrandingContext.tsx), supplies application branding configurations such as app name, logo, primary color, and custom CSS, which are fetched from the backend. The [`TenantContext`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/TenantContext.tsx#L13), defined in [`frontend/src/contexts/TenantContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/TenantContext.tsx), manages the active tenant for multi-tenancy, user roles within the tenant, and sets tenant-specific headers for API requests. Lastly, the [`ThemeContext`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx#L14), found in [`frontend/src/contexts/ThemeContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx), controls the application's UI theme (dark, light, or system preference).

Routing in the application uses [`BrowserRouter`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/App.tsx#L2) from [`react-router-dom`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/App.tsx#L2). Routes are categorized into public pages, authentication flows, protected user sections, and administrative areas. Many pages, particularly within authentication and admin sections, are lazy-loaded to improve performance, with a loading spinner displayed during content retrieval. Access control is enforced through [`ProtectedRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ProtectedRoute.tsx#L5), which ensures users are authenticated, and [`AdminRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminRoute.tsx#L4), which restricts administrative paths to root tenants.

All interactions with the backend API are centralized through an [`axios`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L515) instance within the [`frontend/src/api`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api) directory, specifically in [`frontend/src/api/client.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts). This client dynamically manages authentication tokens and tenant identifiers in request headers. It also includes an interceptor that automatically handles 401 Unauthorized errors by refreshing access tokens, queuing pending requests, and retrying them. Another interceptor redirects users to the [`/setup`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L34) page if the system requires initial configuration, indicated by a 503 status code with a redirect instruction. The API client provides structured access to various backend services, including authentication, tenant management, administrative functions, billing, product management, and telemetry.

The [`BootstrapGuard`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/bootstrap.go#L75) component ensures the application's initial setup status is checked. If setup is required, it redirects all routes to the [`/setup`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L34) path, rendering the [`BootstrapPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/BootstrapPage.tsx#L6) to guide the user through the initial configuration process. See [Development Environment Scripting](https://codewiki.google/github.com/jonradoff/lastsaas#development-environment-and-setup-development-environment-scripting) for details on backend setup.

### Global State Management with React Context

link

zoom\_in

React Context is used to manage global application state for authentication, branding, multi-tenancy, and UI themes. This approach centralizes critical data and functions, making them accessible to components throughout the application without the need for prop drilling.

The global state management is organized into distinct contexts, each responsible for a specific domain:

-   **Authentication Context**: Managed by [`frontend/src/contexts/AuthContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/AuthContext.tsx), this context handles user authentication state, including user data, membership information, authentication status, and loading states. It provides core functionalities for user login, registration, multi-factor authentication (MFA) challenge completion, and logout. JWTs are stored in [`localStorage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L55) for session persistence.
-   **Branding Context**: Defined in [`frontend/src/contexts/BrandingContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/BrandingContext.tsx), this context provides application branding configurations, such as the application name, logos, primary colors, and custom CSS. It fetches branding data from the backend and makes it available, allowing for dynamic styling and white-labeling of the application interface.
-   **Tenant Context**: Located in [`frontend/src/contexts/TenantContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/TenantContext.tsx), this context manages the active tenant in a multi-tenant environment. It allows components to retrieve and update the current tenant, determine if it's a root tenant, and access the user's role within that tenant. It automatically restores a tenant from [`localStorage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L55) or defaults to an appropriate tenant based on user memberships.
-   **Theme Context**: Implemented in [`frontend/src/contexts/ThemeContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx), this context manages the application's UI theme, supporting dark, light, and system modes. It initializes the theme from user preferences or local storage, applies the resolved theme to the DOM, and synchronizes user theme preferences with the backend. It also listens for system theme changes to adapt the interface accordingly.

Each context uses a Provider component to encapsulate its logic and state, and a custom hook to simplify consumption by child components. This modular design ensures that each area of global state is managed independently while providing consistent data and functionality across the application.

### API Communication and Interceptors

link

zoom\_in

The frontend application utilizes a centralized API client, primarily configured through an [`axios`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L515) instance within [`frontend/src/api/client.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts). This client manages all interactions with the backend, abstracting API calls into distinct functional areas such as authentication, tenant management, administration, billing, and product management.

Dynamic header management is integral to securing and contextualizing requests. Functions like [`setAuthToken`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L10) and [`setTenantHeader`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L18) dynamically control the [`Authorization`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L12) (Bearer token) and [`X-Tenant-ID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L155) headers, ensuring that each API request is properly authenticated and associated with the correct tenant.

The client incorporates advanced interceptors to enhance reliability and user experience. A response interceptor is responsible for handling 401 Unauthorized errors by automatically refreshing access tokens. During the token refresh process, subsequent 401 requests are queued and retried with the newly acquired token, preventing multiple simultaneous refresh attempts and ensuring seamless operation. If a token refresh fails or a refresh token is unavailable, the system clears authentication tokens, removes the [`Authorization`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L12) header, and redirects the user to the login page.

Another interceptor specifically addresses system initialization. If the client receives a 503 Service Unavailable status code with a redirect instruction to [`/setup`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L34), it automatically redirects the user to the initial setup page, indicating that the system requires configuration before full functionality can be accessed.

### Routing and Access Control

link

zoom\_in

The application's routing strategy is managed using [`react-router-dom`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/App.tsx#L2), focusing on access control based on authentication and user roles. Core to this approach are components like [`ProtectedRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ProtectedRoute.tsx#L5) and [`AdminRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminRoute.tsx#L4), which conditionally render content or redirect users based on their authorization status.

The [`ProtectedRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ProtectedRoute.tsx#L5) component, defined in [`frontend/src/components/ProtectedRoute.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ProtectedRoute.tsx), ensures that only authenticated users can access specific routes. It leverages a global authentication context to determine if a user is logged in. While the authentication status is being verified, a loading spinner is displayed to provide visual feedback. If a user is not authenticated, they are redirected to the login page.

For administrative functionalities, the [`AdminRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminRoute.tsx#L4) component, located at [`frontend/src/components/AdminRoute.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminRoute.tsx), restricts access to only root tenants. This component checks the user's tenant context to verify their administrative privileges. Unauthorized users attempting to access administrative routes are redirected to the main dashboard. This layered approach to access control helps secure sensitive areas of the application while providing a consistent user experience. The overall application layout, including navigation and branding, is managed by components such as [`Layout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx#L19) and [`AdminLayout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminLayout.tsx#L28), as discussed in [Core Application Layouts and Navigation](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-components-and-pages-core-application-layouts-and-navigation).

### Dynamic Branding and Theming

link

zoom\_in

The application dynamically applies branding elements and manages UI themes to provide a customizable user experience. Branding configurations are stored and retrieved through the [`BrandingContext`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/BrandingContext.tsx#L40) which includes details such as the application name, logos, primary color, landing page settings, and custom CSS. This data is fetched from the backend via [`brandingApi.get`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/BrandingContext.tsx#L52) and made available application-wide. The [`BrandingProvider`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/BrandingContext.tsx#L46) component manages the state of this branding information and handles its initial loading.

The [`BrandingThemeInjector`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/BrandingThemeInjector.tsx#L61) component in [`frontend/src/components/BrandingThemeInjector.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/BrandingThemeInjector.tsx) uses the [`BrandingContext`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/BrandingContext.tsx#L40) to dynamically modify the web page's appearance. It generates a full color palette (50-900 shades) from a single primary color to ensure visual consistency across the UI. This component also sets the [`document.title`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/CustomPage.tsx#L25), updates the favicon, and injects custom styles, analytics snippets, and additional HTML into the document's head. Security measures, including [`DOMPurify.sanitize`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/CustomPage.tsx#L66), are employed to prevent Cross-Site Scripting (XSS) vulnerabilities, especially when injecting user-provided content. Certain branding injections are excluded on administrative pages to maintain a consistent admin interface.

The application's UI theme, encompassing dark, light, and system modes, is managed by the [`ThemeContext`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx#L14). The [`ThemeProvider`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx#L30) in [`frontend/src/contexts/ThemeContext.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx) determines the initial theme based on user preferences, local storage, or a default setting. It applies the chosen theme by setting a [`data-theme`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/styles/index.css#L63) attribute on the [`document.documentElement`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx#L53) and persists the user's selection both in local storage and, for authenticated users, via the [`authApi.updatePreferences`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx#L69) endpoint. The [`ThemeProvider`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx#L30) also dynamically responds to system theme changes if the "system" mode is selected, ensuring the application's theme aligns with the operating system's preference. Components can access the current theme and a function to change it using the [`useTheme`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/ThemeContext.tsx#L80) hook.

The global CSS in [`frontend/src/styles/index.css`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/styles/index.css) leverages CSS custom properties to define color palettes, fonts, and animations, which are then utilized by the dynamic branding and theming mechanisms. This setup allows for consistent and flexible application styling.

### Client-Side Telemetry

link

zoom\_in

Client-side telemetry in the LastSaaS frontend is managed by a custom React hook, [`useTelemetry`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/hooks/useTelemetry.ts#L13), found in [`frontend/src/hooks/useTelemetry.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/hooks/useTelemetry.ts). This hook provides capabilities for tracking user interactions anonymously. It enables page view tracking and custom event tracking.

Page view tracking incorporates a debouncing mechanism to prevent redundant events when a user navigates to the same page multiple times within a short interval. This helps optimize the telemetry data collected. Custom event tracking allows for recording arbitrary user actions with associated properties.

A key aspect of this system is session ID management. A unique session ID is generated and maintained in [`sessionStorage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/hooks/useTelemetry.ts#L5) for each user session. This ID allows for correlating anonymous telemetry events across various interactions within that session. All tracking data is sent to the backend via a dedicated API client, handling API call errors by catching and ignoring them.

### Comprehensive Error Handling

link

typescript

content\_copyCopy

export function getErrorMessage(err: unknown): string { if (/\* axios.isAxiosError(err) \*/ false) { const status = (err as any).response?.status; const data = (err as any).response?.data; // Prioritize backend error message if structured and user-safe if (data && typeof data === 'object' && 'error' in data) { return String(data.error); } // Fallback to generic status-based messages if (status && /\* STATUS\_MESSAGES\[status\] \*/ true) { return \`Error: ${status}\`; // Simplified for snippet } // Use Axios error message if ((err as any).message) return (err as any).message; } // Handle standard Error instances if (err instanceof Error) { return err.message; } // Generic fallback for unknown errors return 'An unexpected error occurred'; }

The frontend application centralizes error handling to ensure user-friendly messages while safeguarding internal details. A utility function processes various error types, particularly those originating from [`axios`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L515) API calls, to generate presentable string messages. This function intelligently determines the most appropriate message by prioritizing structured backend error responses, matching HTTP status codes to generic messages, and filtering potentially verbose error details to prevent their exposure. For example, common HTTP status codes are mapped to generic, user-friendly strings to avoid displaying raw server messages. If an error is not an [`axios`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L515) error but a standard [`Error`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/apierror/apierror.go#L44) instance, its message is returned. In all other cases, a generic "An unexpected error occurred" message is provided, ensuring consistent user feedback across all error scenarios. This systematic approach to error management is primarily defined in [`frontend/src/utils/errors.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/utils/errors.ts).

## Frontend Components and Pages

link

zoom\_in

The React components of LastSaaS define the user interface, encompassing common layouts, authentication flows, administrative tools, and dynamic branding. These components, primarily found in [`frontend/src/components`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components) and [`frontend/src/pages`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages), range from foundational UI elements to complex, feature-rich pages.

Foundational UI components, located in [`frontend/src/components/ui`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui), provide a consistent design language across the application. These include elements like [`Alert`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Alert.tsx#L17) for contextual messages, [`Badge`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Badge.tsx#L19) for labels, [`Button`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Button.tsx#L24) for actions, [`Card`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Card.tsx#L15) for content grouping, and [`Input`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Input.tsx#L8), [`Select`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Select.tsx#L8), and [`Textarea`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Textarea.tsx#L8) for form interactions. The [`Modal`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Modal.tsx#L12) component offers a standardized dialog overlay for user confirmations or detailed information. These components are designed for reusability and can be customized via properties like [`variant`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Alert.tsx#L6) and [`size`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L75), leveraging Tailwind CSS for styling and incorporating accessibility features such as [`forwardRef`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Input.tsx#L1) for DOM access and dynamic [`id`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L2) generation for labels.

Core application layouts are structured to manage the overall user experience. The [`Layout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx#L19) component in [`frontend/src/components/Layout.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx) establishes the main application structure, integrating global state for authentication, tenant context, branding, and theme management. It handles initial data fetching for user-specific information and displays dynamic navigation, a tenant switcher for multi-tenant users, and an announcement banner. For administrative sections, the [`AdminLayout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminLayout.tsx#L28) component in [`frontend/src/components/AdminLayout.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminLayout.tsx) provides a specialized structure, ensuring that only root tenants can access these areas and offering dedicated navigation for administrative tasks.

Authentication and access control are managed through specific components. The [`ProtectedRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ProtectedRoute.tsx#L5) in [`frontend/src/components/ProtectedRoute.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ProtectedRoute.tsx) safeguards general application routes, ensuring users are authenticated before access. Similarly, the [`AdminRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminRoute.tsx#L4) in [`frontend/src/components/AdminRoute.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminRoute.tsx) restricts administrative pages to root tenants. During an administrative impersonation session, the [`ImpersonationBanner`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ImpersonationBanner.tsx#L6) in [`frontend/src/components/ImpersonationBanner.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ImpersonationBanner.tsx) provides a visual cue and an option to terminate the session. When the application is starting up, the [`BootstrapPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/BootstrapPage.tsx#L6) in [`frontend/src/pages/BootstrapPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/BootstrapPage.tsx) guides the user through the initial setup process, which involves creating an admin account, and then periodically checks for system initialization before redirecting to the login page.

Dynamic branding is a key feature, supported by components like [`BrandingThemeInjector`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/BrandingThemeInjector.tsx#L61) in [`frontend/src/components/BrandingThemeInjector.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/BrandingThemeInjector.tsx). This component dynamically injects styles, fonts, meta tags, and scripts based on branding configurations, ensuring the application's appearance adapts to specific branding requirements. It includes mechanisms for generating color palettes from a primary color and securely sanitizing user-provided HTML content to prevent XSS vulnerabilities.

The application includes a variety of pages catering to both administrative and user-facing functionalities. Administrative pages, located in [`frontend/src/pages/admin`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin), offer comprehensive tools for managing the system. This includes pages for API key and webhook management ([`APIPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/APIPage.tsx#L1138)), viewing application version information ([`AboutPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/AboutPage.tsx#L9)), creating and managing announcements ([`AnnouncementsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/AnnouncementsPage.tsx#L16)), customizing branding elements ([`BrandingPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/BrandingPage.tsx#L13)), and configuring system variables ([`ConfigPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/ConfigPage.tsx#L38)). The administrative dashboard ([`AdminDashboardPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/DashboardPage.tsx#L38)) provides an overview of system health and key metrics. Financial reporting, including transaction listings ([`AdminFinancialPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/FinancialPage.tsx#L9)) and metrics aggregation, is also available. System health monitoring is detailed in [System Health Monitoring in Admin](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-components-and-pages-administrative-pages-and-features-system-health-monitoring-in-admin), which allows administrators to track system performance, node status, and integration health checks. Log management ([`LogsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/LogsPage.tsx#L36)), message handling ([`MessagesPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/MessagesPage.tsx#L10)), product analytics ([`PMPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PMPage.tsx#L797)), and the management of subscription plans and credit bundles ([`PlansPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PlansPage.tsx#L15)) are also part of the administrative interface. Furthermore, administrators can manage promotion codes ([`PromotionsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PromotionsPage.tsx#L25)), members of the root tenant ([`RootMembersPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/RootMembersPage.tsx#L14)), and view/manage tenant profiles ([`TenantProfilePage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/TenantProfilePage.tsx#L14)) and user accounts ([`UsersPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/UsersPage.tsx#L32), [`UserProfilePage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/UserProfilePage.tsx#L11)).

User-facing pages, found in [`frontend/src/pages/app`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app), provide the core application experience. These include an [`ActivityPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/ActivityPage.tsx#L19) for reviewing user actions, billing-related pages like [`BillingCancelPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/BillingCancelPage.tsx#L4) and [`BillingSuccessPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/BillingSuccessPage.tsx#L5), and a [`BuyCreditsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/BuyCreditsPage.tsx#L13) for purchasing credit bundles. The [`DashboardPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/DashboardPage.tsx#L8) serves as the user's main entry point, displaying relevant information and branding-driven content. The [`OnboardingPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/OnboardingPage.tsx#L9) guides new users through a multi-step setup process. Users can manage their subscription plans on the [`PlanPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/PlanPage.tsx#L35) and administer their team members on the [`TeamPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/TeamPage.tsx#L27). A [`TestEntitlementsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/TestEntitlementsPage.tsx#L28) allows for checking feature access based on current plans. User settings, discussed in [User Settings and Profile Management](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-components-and-pages-user-facing-application-pages-user-settings-and-profile-management), centralize profile management, security settings (MFA, passkeys), and billing information.

Authentication flow pages, located in [`frontend/src/pages/auth`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth), handle various aspects of user login and registration. This includes [`LoginPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/LoginPage.tsx#L27) for traditional email/password and passkey authentication, [`SignupPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/SignupPage.tsx#L26) for user registration, [`ForgotPasswordPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/ForgotPasswordPage.tsx#L6) and [`ResetPasswordPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/ResetPasswordPage.tsx#L6) for password recovery, and [`VerifyEmailPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/VerifyEmailPage.tsx#L6) for email confirmation. OAuth callbacks are managed by [`AuthCallbackPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/AuthCallbackPage.tsx#L7), and multi-factor authentication challenges are handled by [`MFAChallengePage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/MFAChallengePage.tsx#L6). Magic link verification is processed by [`MagicLinkVerifyPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/MagicLinkVerifyPage.tsx#L7).

Public-facing content pages, within [`frontend/src/pages/public`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public), include a [`LandingPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/LandingPage.tsx#L7) that dynamically adapts content based on branding configurations and a [`CustomPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L80) for displaying administrator-defined public content, complete with SEO management and XSS protection.

For handling temporary loading states, the [`LoadingSpinner`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/LoadingSpinner.tsx#L6) component in [`frontend/src/components/LoadingSpinner.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/LoadingSpinner.tsx) provides visual feedback to the user. Errors are gracefully managed by the [`ErrorBoundary`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ErrorBoundary.tsx#L13) component in [`frontend/src/components/ErrorBoundary.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ErrorBoundary.tsx), which catches JavaScript errors in child components and displays a fallback UI, preventing application crashes. For user confirmation dialogs, the [`ConfirmModal`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ConfirmModal.tsx#L15) component in [`frontend/src/components/ConfirmModal.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ConfirmModal.tsx) handles modal visibility, user interaction, and accessibility. When displaying data in a table format while content is loading, the [`TableSkeleton`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/TableSkeleton.tsx#L6) in [`frontend/src/components/TableSkeleton.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/TableSkeleton.tsx) renders an animated placeholder structure.

### Foundational UI Components

link

Component

Description

Primary Customizable Prop

`Alert`

Displays a short, important message to the user.

`variant` (error, success, info)

`Badge`

Renders a small, inline label or indicator.

`variant` (success, danger, warning, info, neutral)

`Button`

An interactive button for user actions.

`variant` (primary, secondary, danger, ghost)

`Card`

A flexible container for grouping related content.

`padding` (none, sm, md, lg)

`Input`

A form input field for text entry.

`label`, `error`

`Modal`

Displays content in an overlay window.

`maxWidth`

`Select`

A dropdown for selecting one or more options.

`label`, `error`

`Textarea`

A multiline text input field.

`label`, `error`

The frontend application utilizes a collection of reusable and consistent UI components that serve as foundational building blocks. These components, located in the [`frontend/src/components/ui`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui) directory, provide standardized styling, functionality, and accessibility features across the application. Each component is designed to be customizable through props, allowing for variations in appearance and behavior while maintaining overall UI consistency.

Key components in this collection include:

-   [`Alert`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Alert.tsx#L17): Displays contextual messages with predefined visual styles, indicating success, error, or informational states. This component, defined in [`frontend/src/components/ui/Alert.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Alert.tsx), uses a [`variant`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Alert.tsx#L6) prop to apply specific background, border, and text colors.
-   [`Badge`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Badge.tsx#L19): Renders small, styled informational labels, as seen in [`frontend/src/components/ui/Badge.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Badge.tsx). It supports various [`variant`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Alert.tsx#L6) options such as [`'success'`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Alert.tsx#L3), [`'danger'`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Badge.tsx#L3), and [`'neutral'`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Badge.tsx#L3) to dictate its color scheme.
-   [`Button`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Button.tsx#L24): Provides a customizable button component, detailed in [`frontend/src/components/ui/Button.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Button.tsx), with options for [`variant`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Alert.tsx#L6) (e.g., [`primary`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/auth/github_oauth.go#L27), [`danger`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PMPage.tsx#L780), [`ghost`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Button.tsx#L3)) and [`size`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L75) ([`sm`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx#L122), [`md`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L42)), allowing for consistent interactive elements.
-   [`Card`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Card.tsx#L15): A styled container component, found in [`frontend/src/components/ui/Card.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Card.tsx), that provides a consistent visual wrapper for content, featuring a dark, semi-transparent background, blurred backdrop, and rounded corners. Its [`padding`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Card.tsx#L5) prop controls internal spacing.
-   [`Input`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Input.tsx#L8): Offers a reusable input field, implemented in [`frontend/src/components/ui/Input.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Input.tsx), that includes integrated labeling and error display. It dynamically generates an [`id`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/types/index.ts#L2) for accessibility if one is not provided.
-   [`Modal`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Modal.tsx#L12): Renders an overlay dialog component, described in [`frontend/src/components/ui/Modal.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Modal.tsx), for displaying content that requires user attention. It manages its open/close state and provides a customizable title and content area.
-   [`Select`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Select.tsx#L8): A customizable HTML select element, defined in [`frontend/src/components/ui/Select.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Select.tsx), with optional label and error display. It supports standard HTML select attributes and improves accessibility through dynamic ID generation.
-   [`Textarea`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Textarea.tsx#L8): Provides a reusable multiline text input component, seen in [`frontend/src/components/ui/Textarea.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Textarea.tsx), that includes integrated labeling and error display, similar to the [`Input`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Input.tsx#L8) component.

These components are typically styled using Tailwind CSS, ensuring a uniform appearance and simplified styling management. The use of [`forwardRef`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Input.tsx#L1) in components like [`Input`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Input.tsx#L8), [`Select`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Select.tsx#L8), and [`Textarea`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/Textarea.tsx#L8) allows parent components to access the underlying DOM elements, facilitating integration with form libraries and direct DOM manipulation when necessary. The [`frontend/src/components/ui/index.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ui/index.ts) file acts as a centralized export point, simplifying imports of these UI components throughout the application.

### Core Application Layouts and Navigation

link

zoom\_in

The core application layouts establish the overall structure and navigation within the LastSaaS frontend, adapting dynamically based on user authentication, tenant context, and branding configurations. These components ensure a consistent user experience and enforce access control across different parts of the application.

The primary layout for general users is provided by the [`Layout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx#L19) component, located in [`frontend/src/components/Layout.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx). This component integrates various global contexts such as authentication, active tenant information, branding settings, and UI themes. It is responsible for fetching initial application data, including unread message counts, available plans, credit bundles, and announcements. The [`Layout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx#L19) component renders dynamic navigation menus, which can be configured through branding settings, and includes a tenant switcher for users belonging to multiple tenants. It also displays user-specific information, such as available usage credits, and integrates an [`ImpersonationBanner`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ImpersonationBanner.tsx#L6) when an administrative user is impersonating another user. Content specific to individual routes is rendered within this layout using React Router's [`Outlet`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx#L1) component.

For administrative functionalities, the [`AdminLayout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminLayout.tsx#L28) component, found in [`frontend/src/components/AdminLayout.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminLayout.tsx), provides a specialized layout. This layout specifically enforces that only root tenants can access administrative sections, redirecting unauthorized users to the dashboard. It features a distinct header and a sidebar with navigation links tailored for various administrative sub-sections. The [`AdminLayout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminLayout.tsx#L28) also displays the count of unread messages, providing administrators with a quick overview of pending communications.

Both [`Layout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/Layout.tsx#L19) and [`AdminLayout`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminLayout.tsx#L28) leverage global state management hooks to integrate contextual information, allowing them to dynamically adjust their appearance and functionality. This includes using the authentication context to determine user status and access levels, the tenant context to manage the active tenant and its associated data, and the branding context to apply custom logos, names, and navigation items. The dynamic configuration of these layouts supports a multi-tenant SaaS architecture where each tenant can have customized branding and access permissions. The underlying mechanics of access control are further detailed in [HTTP Middleware for Authentication and Authorization](https://codewiki.google/github.com/jonradoff/lastsaas#authentication-and-authorization-http-middleware-for-authentication-and-authorization) and [Authentication and Access Control Components](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-components-and-pages-authentication-and-access-control-components).

### Authentication and Access Control Components

link

zoom\_in

The application provides several components to secure routes and manage user access, ensuring that only authorized users or administrators can access specific sections.

The [`ProtectedRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ProtectedRoute.tsx#L5) component, located in [`frontend/src/components/ProtectedRoute.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ProtectedRoute.tsx), manages access to protected routes by checking the user's authentication status. It displays a loading spinner while determining if the user is authenticated. If the user is not authenticated, they are redirected to the login page. Otherwise, the component renders the content of the protected route.

For administrative functionalities, the [`AdminRoute`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminRoute.tsx#L4) component, defined in [`frontend/src/components/AdminRoute.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/AdminRoute.tsx), restricts access to root tenants only. If a user is not identified as a root tenant, they are redirected to the dashboard, preventing unauthorized access to administrative sections.

Finally, the [`ImpersonationBanner`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ImpersonationBanner.tsx#L6) component in [`frontend/src/components/ImpersonationBanner.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/ImpersonationBanner.tsx) is responsible for alerting users when they are impersonating another user. This banner displays the details of the impersonated user and provides an option to end the impersonation session, clearing relevant authentication tokens and returning to the regular user session.

### Dynamic Branding Injection

link

zoom\_in

The [`BrandingThemeInjector`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/BrandingThemeInjector.tsx#L61) component, defined in [`frontend/src/components/BrandingThemeInjector.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/components/BrandingThemeInjector.tsx), dynamically applies application branding elements to the web page. This involves modifying the document's head to inject custom styles, fonts, a favicon, analytics snippets, custom CSS, and custom HTML based on the branding configuration retrieved from [`useBranding`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/contexts/BrandingContext.tsx#L72).

To ensure visual consistency, the component generates a full color palette (shades 50-900) from a single primary color defined in the branding. This palette is then applied via CSS custom properties. Similarly, custom font families are injected to match branding guidelines. The page title and favicon are also dynamically updated based on the branding data.

For integrating analytics and custom HTML, the component carefully injects user-provided snippets into the document's head. Security is a primary concern, so [`DOMPurify.sanitize`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/CustomPage.tsx#L66) is used to clean user-provided content, preventing Cross-Site Scripting (XSS) vulnerabilities. Specifically for analytics snippets, external scripts are dynamically created and appended, while inline scripts are ignored to enhance security. Custom CSS is also injected into a [`<style>`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/api/handlers/docs.go#L961) tag, and any custom HTML for the head is added, with strict sanitization to allow only safe tags and attributes.

The injection process is managed through React's [`useEffect`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/App.tsx#L1) hooks, ensuring that elements are added and removed correctly during the component's lifecycle and when branding data changes. Certain branding elements, such as analytics, custom CSS, and custom head HTML, are intentionally excluded from administrative pages to maintain a clean and controlled environment for system management. For more details on global state management, see [Global State Management with React Context](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-application-structure-global-state-management-with-react-context).

### Administrative Pages and Features

link

Page Name

File Path

Primary Function

API

`/jonradoff/lastsaas/frontend/src/pages/admin/APIPage.tsx`

Manage API keys and configure webhooks for event notifications.

Announcements

`/jonradoff/lastsaas/frontend/src/pages/admin/AnnouncementsPage.tsx`

Create, edit, publish, and manage announcements and changelog entries for users.

Branding

`/jonradoff/lastsaas/frontend/src/pages/admin/BrandingPage.tsx`

Customize application identity, theme, content (landing/dashboard HTML), custom pages, and media assets.

Configuration

`/jonradoff/lastsaas/frontend/src/pages/admin/ConfigPage.tsx`

View and manage application-wide configuration variables.

Dashboard

`/jonradoff/lastsaas/frontend/src/pages/admin/DashboardPage.tsx`

Provides an overview of system health, key business metrics (MRR, ARR, DAU), and top-level statistics.

Financial

`/jonradoff/lastsaas/frontend/src/pages/admin/FinancialPage.tsx`

Review and search all financial transactions across the platform.

Health

`/jonradoff/lastsaas/frontend/src/pages/admin/HealthPage.tsx`

Monitor real-time system health, view server metrics, and check integration statuses.

Logs

`/jonradoff/lastsaas/frontend/src/pages/admin/LogsPage.tsx`

View and filter system log entries by severity, category, user, and date range.

Product Analytics (PM)

`/jonradoff/lastsaas/frontend/src/pages/admin/PMPage.tsx`

Analyze customer journeys, KPIs, retention, and engagement through various product metrics and event flows.

Plans

`/jonradoff/lastsaas/frontend/src/pages/admin/PlansPage.tsx`

Define and manage subscription plans, pricing, entitlements, and one-time credit bundles.

Promotions

`/jonradoff/lastsaas/frontend/src/pages/admin/PromotionsPage.tsx`

Create and manage Stripe promotion codes and coupons, including discounts and product restrictions.

Root Members

`/jonradoff/lastsaas/frontend/src/pages/admin/RootMembersPage.tsx`

Manage members and invitations for the root tenant.

Tenant Profile

`/jonradoff/lastsaas/frontend/src/pages/admin/TenantProfilePage.tsx`

View and edit details for a specific tenant, including plan, billing status, credits, and members.

Tenants

`/jonradoff/lastsaas/frontend/src/pages/admin/TenantsPage.tsx`

List, search, and manage all tenants in the system.

User Profile

`/jonradoff/lastsaas/frontend/src/pages/admin/UserProfilePage.tsx`

View and edit details for a specific user, including email, display name, status, and tenant memberships.

Users

`/jonradoff/lastsaas/frontend/src/pages/admin/UsersPage.tsx`

List, search, and manage all user accounts in the system.

The [`frontend/src/pages/admin`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin) directory contains the administrative frontend pages, providing a comprehensive interface for managing various aspects of the LastSaaS application. These pages allow authorized users to configure system settings, oversee financial operations, manage user and tenant accounts, customize branding, and monitor the overall health and performance of the system.

The [`APIPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/APIPage.tsx#L1138) in [`frontend/src/pages/admin/APIPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/APIPage.tsx) centralizes API management, offering access to API documentation and tools for creating, listing, and managing API keys and webhooks. Administrators can define new API keys with specific authority levels and configure webhooks to send event notifications, including defining subscribed event types and testing delivery.

Announcements are managed through the [`AnnouncementsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/AnnouncementsPage.tsx#L16) in [`frontend/src/pages/admin/AnnouncementsPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/AnnouncementsPage.tsx), which enables administrators to create, edit, publish, unpublish, and delete system-wide announcements. This functionality includes role-based access control, ensuring that only authorized personnel can modify public communications.

For branding customization, the [`BrandingPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/BrandingPage.tsx#L13) in [`frontend/src/pages/admin/BrandingPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/BrandingPage.tsx) provides a central panel to control the application's appearance and content. This includes managing the application's name, tagline, primary colors, custom CSS, HTML for landing and dashboard pages, navigation items, and media assets like logos and favicons. It also supports the creation and management of custom public pages.

System configuration variables ([`ConfigVar`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/config_var.go#L18)s) are managed via the [`ConfigPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/ConfigPage.tsx#L38) in [`frontend/src/pages/admin/ConfigPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/ConfigPage.tsx). This interface allows administrators to view, filter, edit, create, and delete configuration settings. It supports different data types for variables, including specialized handling for enum types, and enforces write permissions based on user roles.

The [`AdminDashboardPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/DashboardPage.tsx#L38) in [`frontend/src/pages/admin/DashboardPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/DashboardPage.tsx) offers a high-level overview of the system's status. It displays critical metrics such as user and tenant counts, financial data (revenue, ARR, DAU), and provides insights into overall system health and integration statuses. This dashboard often integrates charting components to visualize trends over time.

Financial operations are detailed in the [`AdminFinancialPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/FinancialPage.tsx#L9) in [`frontend/src/pages/admin/FinancialPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/FinancialPage.tsx), which provides a searchable and paginated list of all financial transactions. This includes details such as transaction date, type, description, amount, and invoice number, allowing administrators to monitor billing activities. Financial reporting also includes [`cmdFinancialSummary`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L41) for revenue and subscription metrics, [`cmdFinancialTransactions`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L192) for detailed transaction listings with filtering, and [`cmdFinancialMetrics`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_financial.go#L314) for daily business metric trends from aggregated MongoDB data. See [Financial Reporting and Metrics Aggregation](https://codewiki.google/github.com/jonradoff/lastsaas#system-administration-and-cli-tools-financial-reporting-and-metrics-aggregation) for more details.

System health monitoring is handled comprehensively within the admin interface. The [`HealthPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/HealthPage.tsx#L12) in [`frontend/src/pages/admin/HealthPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/HealthPage.tsx) provides real-time monitoring of server nodes, integration statuses, and historical system metrics such as CPU usage, memory, disk I/O, and network activity. It includes features for filtering data by time range and node, as well as an auto-refresh mechanism for continuous updates. For more information, see [System Health Monitoring in Admin](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-components-and-pages-administrative-pages-and-features-system-health-monitoring-in-admin).

Log management is facilitated by the [`LogsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/LogsPage.tsx#L36) in [`frontend/src/pages/admin/LogsPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/LogsPage.tsx), which allows administrators to view, filter, search, and export system logs. This includes filtering by severity, category, user ID, and date range, with real-time streaming capabilities and an auto-refresh option for continuous monitoring.

The [`PMPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PMPage.tsx#L797) in [`frontend/src/pages/admin/PMPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PMPage.tsx) serves as a product analytics dashboard, offering insights across various tabs such as Funnel, KPIs, Retention, Engagement, and Events. It visualizes data using charts and tables, and in the Events tab, allows for defining and managing event definitions, and visualizing event flows. The [`EventDefinitionModal`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/EventDefinitionModal.tsx#L25) in [`frontend/src/pages/admin/EventDefinitionModal.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/EventDefinitionModal.tsx) supports the creation or editing of event definitions within this dashboard.

Subscription plans and credit bundles are managed through the [`PlansPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PlansPage.tsx#L15) in [`frontend/src/pages/admin/PlansPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PlansPage.tsx). This interface enables viewing, creating, editing, archiving, and unarchiving plans and bundles, along with defining entitlements and pricing structures.

Promotional codes and coupons are managed on the [`PromotionsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PromotionsPage.tsx#L25) in [`frontend/src/pages/admin/PromotionsPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/PromotionsPage.tsx). Administrators can display, create, edit, and deactivate promotions, specifying details like discount types, redemption limits, and product restrictions.

User and tenant administration capabilities are provided through dedicated pages. The [`UsersPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/UsersPage.tsx#L32) in [`frontend/src/pages/admin/UsersPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/UsersPage.tsx) and [`TenantsPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/TenantsPage.tsx#L14) in [`frontend/src/pages/admin/TenantsPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/TenantsPage.tsx) allow for listing, searching, filtering, and managing user accounts and tenant organizations, respectively. The [`RootMembersPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/RootMembersPage.tsx#L14) in [`frontend/src/pages/admin/RootMembersPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/RootMembersPage.tsx) specifically manages members and invitations for the root tenant. Detailed profiles for individual users ([`UserProfilePage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/UserProfilePage.tsx#L11) in [`frontend/src/pages/admin/UserProfilePage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/UserProfilePage.tsx)) and tenants ([`TenantProfilePage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/TenantProfilePage.tsx#L14) in [`frontend/src/pages/admin/TenantProfilePage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/TenantProfilePage.tsx)) offer capabilities to modify information, manage billing settings, adjust usage credits, and control account statuses.

#### System Health Monitoring in Admin

link

zoom\_in

The admin section provides a dedicated interface for monitoring the health and performance of the LastSaaS application. It aggregates and visualizes critical system metrics, integration statuses, and historical data, offering administrators a consolidated view of the system's operational state.

A [`CurrentStatusPanel`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/CurrentStatusPanel.tsx#L13) displays a real-time summary of key system indicators, such as CPU, memory, and disk utilization, HTTP request counts, latency, and 5xx error rates. These metrics are presented in a grid of status cards, with dynamic styling indicating their health status. For instance, the system calculates average CPU usage, memory usage, and 95th percentile request latency, formatting them with utilities like [`formatPercent`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/formatters.ts#L15) and [`formatMs`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/formatters.ts#L9) from [`frontend/src/pages/admin/health/formatters.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/formatters.ts). The visual cues for health status are determined by [`statusColor`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/formatters.ts#L19) and [`statusBg`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/formatters.ts#L25) functions, which apply Tailwind CSS classes based on predefined warning and critical thresholds.

The [`IntegrationsPanel`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/IntegrationsPanel.tsx#L249) component provides insights into the health of third-party integrations, such as Stripe, Resend, Google OAuth, GitHub OAuth, and Microsoft OAuth. Each integration's status (healthy, unhealthy, or not configured), along with messages and recent activity, is displayed. This panel includes interactive features like "Setup Help" buttons for unconfigured integrations, which open a [`SetupModal`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/IntegrationsPanel.tsx#L132) with detailed instructions from the [`getSetupHelp`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/IntegrationsPanel.tsx#L33) function. For the Resend integration, a "Send Test Email" function is available via a [`SendTestEmailModal`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/IntegrationsPanel.tsx#L181), allowing administrators to verify email delivery.

Historical system and application metrics are visualized through interactive charts in the [`MetricsCharts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/MetricsCharts.tsx#L103) component. This component processes [`SystemMetric`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L30) objects and aggregates data based on [`filterMode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/MetricsCharts.tsx#L19). If multiple nodes are present, metrics can be grouped by timestamp, or averaged/summed across nodes for a consolidated view. The charts use the [`recharts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L203) library to display trends in CPU usage, memory, disk I/O, network activity, HTTP requests, MongoDB [`serverStatus`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/health/health.go#L309) and [`dbStats`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/cmd_db.go#L39), Go runtime metrics, and API call counts. These charts are wrapped within [`ChartCard`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/ChartCard.tsx#L6) components for consistent presentation.

The [`NodeCards`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/NodeCards.tsx#L18) component provides a visual representation of each registered [`SystemNode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L18), displaying details such as hostname, machine ID, version, Go version, last seen time, and uptime. The [`status`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L22) of each node dictates color-coded icons and text, providing immediate visual feedback on its operational state. The [`timeAgo`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/cmd/lastsaas/output.go#L125) utility function, also used for [`IntegrationsPanel`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/IntegrationsPanel.tsx#L249), formats timestamps into human-readable strings like "5m ago" or "2h ago".

Administrators can configure the displayed data using the [`TimeRangeSelector`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/admin/health/TimeRangeSelector.tsx#L27) component. This allows selection of different time ranges (e.g., '1h', '24h', '7d') and node filtering modes ('aggregate' for all nodes combined, 'all' for individual data from all nodes, or 'single' for a specific node). When the 'single' filter mode is active, a dropdown enables the selection of a particular [`SystemNode`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/health.go#L18) from the list of available nodes. This configuration flexibility helps in diagnosing issues by focusing on specific timeframes or individual nodes.

### User-Facing Application Pages

link

zoom\_in

The frontend application provides a suite of user-facing pages, accessible to regular users after authentication, which allows them to manage their accounts, subscriptions, and team. These pages cover areas such as activity logging, billing and credit purchasing, dashboard views, multi-step onboarding, plan management, team administration, and entitlement testing.

The primary entry point after authentication is the Dashboard page ([`frontend/src/pages/app/DashboardPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/DashboardPage.tsx)). This page offers a personalized welcome message, displays the user's display name and active tenant's name, and provides navigation links to various sections of the application. It also supports dynamic content injection from branding settings, ensuring a customized experience.

For new users, a multi-step Onboarding page ([`frontend/src/pages/app/OnboardingPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/OnboardingPage.tsx)) guides them through initial profile setup and team invitations. This ensures that users are properly introduced to the application and can quickly get started.

Users can manage their subscription plans through the Plan page ([`frontend/src/pages/app/PlanPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/PlanPage.tsx)). This page displays current plan details, allows users to browse available plans, switch subscriptions, and cancel services. It integrates with billing APIs to facilitate checkout and cancellation processes, including handling scenarios where billing waivers are present. Alongside plan management, the Buy Credits page ([`frontend/src/pages/app/BuyCreditsPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/BuyCreditsPage.tsx)) enables users to purchase additional credit bundles, extending their usage within the platform. Confirmation pages, such as [`frontend/src/pages/app/BillingCancelPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/BillingCancelPage.tsx) and [`frontend/src/pages/app/BillingSuccessPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/BillingSuccessPage.tsx), provide immediate feedback on payment outcomes.

Team administration is handled by the Team page ([`frontend/src/pages/app/TeamPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/TeamPage.tsx)), where users can invite new members, remove existing ones, and modify roles within their tenant. This page also integrates with subscription plans to enforce user limits and prompt plan upgrades if necessary.

An Activity page ([`frontend/src/pages/app/ActivityPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/ActivityPage.tsx)) presents a paginated list of organizational activity logs. Users can filter these logs by action and perform full-text searches, providing an audit trail of events within their tenant.

For advanced users or administrators, the Test Entitlements page ([`frontend/src/pages/app/TestEntitlementsPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/TestEntitlementsPage.tsx)) offers a user interface to test entitlements against their current plan and compare features across all available plans. This page is typically restricted to root tenants, providing a powerful tool for understanding plan capabilities.

User-specific settings are consolidated in the Settings page ([`frontend/src/pages/app/SettingsPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/SettingsPage.tsx)) which serves as a hub for managing various aspects of a user's account. This page dynamically displays tabs for profile management, security settings (including multi-factor authentication and passkeys), active sessions, and billing information. More details on these specific settings are provided in [User Settings and Profile Management](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-components-and-pages-user-facing-application-pages-user-settings-and-profile-management).

#### User Settings and Profile Management

link

zoom\_in

User settings pages within the application provide an interface for managing personal details, security preferences, and account activity. This includes functionalities for handling billing information, two-factor authentication (MFA), passkeys, user profile updates (such as password changes and data export), and the management of active user sessions.

The billing tab, represented by [`frontend/src/pages/app/settings/BillingTab.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/settings/BillingTab.tsx), presents a summary of the user's current subscription plan, including its status, billing interval, and the end date of the current period. It also displays a paginated history of financial transactions. Users can access an external billing portal to manage payment methods and view detailed invoices through a dedicated modal ([`frontend/src/pages/app/settings/InvoiceModal.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/settings/InvoiceModal.tsx)), which also allows for the download of invoice PDFs.

Security settings, handled by [`frontend/src/pages/app/settings/SecurityTab.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/settings/SecurityTab.tsx), enable users to configure and manage their MFA options. This includes initiating the setup of Time-based One-Time Password (TOTP) through a guided process in the [`MFASetupModal`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/settings/MFASetupModal.tsx#L11) ([`frontend/src/pages/app/settings/MFASetupModal.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/settings/MFASetupModal.tsx)), which involves scanning a QR code, verifying an authenticator app code, and generating recovery codes. Users can also disable MFA and manage passkeys, including adding new ones using WebAuthn flows and deleting existing ones.

The profile tab, defined in [`frontend/src/pages/app/settings/ProfileTab.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/settings/ProfileTab.tsx), allows users to view and update their personal information, such as their display name and email. It provides mechanisms for email verification, password changes with integrated strength validation, and options for exporting account data. Account deletion functionality is also available, often requiring password confirmation for sensitive operations.

Finally, the sessions tab, located at [`frontend/src/pages/app/settings/SessionsTab.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/app/settings/SessionsTab.tsx), lists all active user sessions, showing details such as device information and IP address. This interface allows users to revoke individual sessions or all sessions except the current one, enhancing account security by enabling users to terminate unauthorized access.

### Authentication Flow Pages

link

zoom\_in

The frontend application provides a comprehensive suite of pages dedicated to user authentication, covering various stages of user interaction from initial access to secure session management. These pages, located within the [`frontend/src/pages/auth`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth) directory, interact with backend authentication APIs and leverage global state managed by React Contexts to ensure consistent behavior and branding.

User login is managed by the [`LoginPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/LoginPage.tsx#L27) component in [`frontend/src/pages/auth/LoginPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/LoginPage.tsx), which offers multiple authentication methods including traditional email/password, magic links, and passkeys. It also integrates with OAuth providers like Google, GitHub, and Microsoft, dynamically displaying these options based on the application's branding configuration. During the login process, if multi-factor authentication (MFA) is required, the user is directed to the [`MFAChallengePage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/MFAChallengePage.tsx#L6) in [`frontend/src/pages/auth/MFAChallengePage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/MFAChallengePage.tsx), where they can enter their verification code. OAuth callbacks are handled by [`AuthCallbackPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/AuthCallbackPage.tsx#L7) in [`frontend/src/pages/auth/AuthCallbackPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/AuthCallbackPage.tsx), which processes authorization codes and manages the subsequent token exchange and potential MFA redirects.

For new users, the [`SignupPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/SignupPage.tsx#L26) in [`frontend/src/pages/auth/SignupPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/SignupPage.tsx) provides an interface for account registration. This page supports email/password registration, integrates with OAuth providers, and can process invitation tokens for team-based sign-ups. Email verification, often a follow-up to registration, is managed by the [`VerifyEmailPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/VerifyEmailPage.tsx#L6) in [`frontend/src/pages/auth/VerifyEmailPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/VerifyEmailPage.tsx), which processes verification tokens received via email to confirm the user's address.

Password management functionalities include [`ForgotPasswordPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/ForgotPasswordPage.tsx#L6) in [`frontend/src/pages/auth/ForgotPasswordPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/ForgotPasswordPage.tsx) for initiating a password reset request, and [`ResetPasswordPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/ResetPasswordPage.tsx#L6) in [`frontend/src/pages/auth/ResetPasswordPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/ResetPasswordPage.tsx) for setting a new password using a token. The system also supports magic link verification through the [`MagicLinkVerifyPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/MagicLinkVerifyPage.tsx#L7) in [`frontend/src/pages/auth/MagicLinkVerifyPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/auth/MagicLinkVerifyPage.tsx), allowing users to authenticate by clicking a link sent to their email. These pages collectively ensure a secure and flexible authentication experience for users.

### Public-Facing Content Pages

link

zoom\_in

The [`public`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/VERSIONS.md?plain=1#L60) directory contains components for rendering public-facing content. This includes the [`LandingPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/LandingPage.tsx#L7) for dynamic, branding-driven experiences and the [`CustomPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L80) for displaying administrator-defined public pages with SEO management and XSS protection.

The [`LandingPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/LandingPage.tsx#L7) component, located in [`frontend/src/pages/public/LandingPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/LandingPage.tsx), dynamically adjusts its content and behavior based on global branding configurations. It renders HTML content retrieved from branding settings, ensuring the content is sanitized using [`DOMPurify`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L277) to prevent cross-site scripting (XSS) vulnerabilities. This component also optimizes for SEO by dynamically updating the page's title and meta description. Authentication status influences routing, where authenticated users are redirected to the dashboard, and unauthenticated users may be directed to the login page if the landing page feature is disabled.

The [`CustomPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L80) component, defined in [`frontend/src/pages/public/CustomPage.tsx`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/CustomPage.tsx), fetches and displays custom public pages based on a URL slug. It manages loading states, handles 404 errors for non-existent pages, and dynamically updates SEO metadata like the document title and meta description. The HTML content displayed by [`CustomPage`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/models/branding.go#L80) is sanitized using [`DOMPurify.sanitize`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/pages/public/CustomPage.tsx#L66) before being injected into the DOM, providing protection against XSS attacks.

## Frontend API Client

link

zoom\_in

The LastSaaS frontend utilizes a centralized API client, primarily implemented in [`frontend/src/api/client.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts), to manage all interactions with the backend services. This client abstracts the complexities of HTTP requests, focusing on secure communication, robust error handling, and multi-tenant operations.

Requests are handled through an [`axios`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L515) instance configured to communicate with the [`/api`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L232) endpoint. This instance is equipped with mechanisms to dynamically manage [`Authorization`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L12) (Bearer token) and [`X-Tenant-ID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L155) headers, ensuring that all API calls are both authenticated and properly scoped to the current tenant.

A key feature of the API client is its ability to handle authentication token lifecycles. It automatically intercepts 401 Unauthorized errors from the backend. When such an error occurs, the client attempts to refresh the access token using a stored refresh token. To prevent race conditions and excessive requests during this process, it queues any subsequent 401 requests, replaying them once a new access token has been successfully acquired. If the token refresh fails or a valid refresh token is unavailable, the user is redirected to the login page to re-authenticate.

Additionally, the client incorporates specific logic to manage the application's initial setup phase. If a backend response indicates a 503 Service Unavailable status along with a redirect instruction to [`/setup`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L34), the client automatically directs the user to the setup page, facilitating the system's first-time configuration.

The client organizes backend API calls into distinct, functional categories. This structured approach, using separate objects for areas such as authentication, tenant management, administration, billing, and product management, provides a clear and consistent interface for frontend developers to interact with various backend services. For a detailed breakdown of the available API endpoints and their functionalities, refer to [Structured API Endpoints for Backend Services](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-api-client-structured-api-endpoints-for-backend-services).

### Dynamic Header Management and Multi-Tenancy

link

typescript

content\_copyCopy

// api.ts import axios from 'axios'; // ... other imports and types ... const api = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' }, }); /\*\* \* Sets or removes the Authorization header for all API requests. \* @param token The access token, or null to remove the header. \*/ export function setAuthToken(token: string | null) { if (token) { api.defaults.headers.common\['Authorization'\] = \`Bearer ${token}\`; } else { delete api.defaults.headers.common\['Authorization'\]; } } /\*\* \* Sets or removes the X-Tenant-ID header for all API requests. \* @param tenantId The tenant ID, or null to remove the header. \*/ export function setTenantHeader(tenantId: string | null) { if (tenantId) { api.defaults.headers.common\['X-Tenant-ID'\] = tenantId; } else { delete api.defaults.headers.common\['X-Tenant-ID'\]; } } // ... other API interceptors and client exports ...

The frontend application's API client centrally manages HTTP headers to facilitate secure, authenticated, and multi-tenant requests. The [`setAuthToken`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L10) function in [`frontend/src/api/client.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts) dynamically sets or removes the [`Authorization`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L12) Bearer token header, which is essential for authenticating user sessions. Similarly, the [`setTenantHeader`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L18) function, also in [`frontend/src/api/client.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts), manages the [`X-Tenant-ID`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L155) header. This header is crucial for multi-tenant applications, ensuring that each API request is correctly routed and processed within the context of the active tenant. By managing these headers dynamically, the client ensures that all subsequent API calls automatically include the necessary authentication and tenant identification information.

### Robust Token Refresh and Request Queuing Interceptor

link

zoom\_in

The frontend API client includes an advanced token refresh interceptor designed to automatically manage access tokens and maintain user sessions. This mechanism proactively handles [`401 Unauthorized`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/apierror/apierror.go#L67) errors, which typically occur when an access token expires.

When a [`401 Unauthorized`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/apierror/apierror.go#L67) response is received, the interceptor attempts to refresh the access token using a stored refresh token. To prevent multiple simultaneous refresh attempts, it employs a queuing system: any subsequent requests that also encounter a [`401 Unauthorized`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/backend/internal/apierror/apierror.go#L67) status are temporarily paused and added to a queue. Once the token refresh process is successfully completed, the new access token is updated, and all queued requests are automatically retried with the refreshed token, ensuring a seamless user experience without requiring re-authentication.

If the token refresh process fails, or if a refresh token is not available, the system clears all stored authentication tokens, removes the [`Authorization`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L12) header, and redirects the user to the [`/login`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/App.tsx#L140) page, prompting them to re-authenticate. This ensures that only authenticated users can access protected resources and handles cases where a user's session is no longer valid. For more context on how access and refresh tokens are managed, refer to [JWT Management and Token Types](https://codewiki.google/github.com/jonradoff/lastsaas#authentication-and-authorization-jwt-management-and-token-types).

### System Initialization and Service Unavailable Handling

link

typescript

content\_copyCopy

api.interceptors.response.use( (res) => res, (error) => { // Check for a 503 Service Unavailable status if (error.response?.status === 503 && error.response?.data?.redirect === '/setup') { // If a 503 is returned and the response data contains // a specific redirect instruction for '/setup', // the browser is redirected to the setup page. window.location.href = '/setup'; } return Promise.reject(error); } );

The frontend API client includes an [`axios`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L515) interceptor designed to manage the application's initial setup phase. This interceptor specifically monitors for HTTP responses with a 503 Service Unavailable status code. When such a response is received, and it includes a [`redirect`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/README.md?plain=1#L124) instruction pointing to [`/setup`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L34), the interceptor automatically redirects the user's browser to the [`/setup`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/CLAUDE.md?plain=1#L34) route. This mechanism is crucial for guiding users through the necessary initial configuration steps of the LastSaaS system, ensuring that the application is properly initialized before full access is granted. This allows the system to communicate that setup is required and direct the user without manual intervention. For further details on the overall API client structure, see [Frontend API Client](https://codewiki.google/github.com/jonradoff/lastsaas#frontend-api-client).

### Structured API Endpoints for Backend Services

link

API Client Object

Primary Functions

Example Operations

`bootstrapApi`

Check system initialization status.

`bootstrapApi.status()`

`authApi`

User authentication (register, login, logout), MFA, password management, session management, passkeys, and user preferences.

`authApi.login({ email, password })`, `authApi.mfaSetup()`, `authApi.listSessions()`

`tenantApi`

Manage tenant members, invitations, activity logs, and tenant settings.

`tenantApi.listMembers()`, `tenantApi.inviteMember(email, role)`, `tenantApi.getActivity()`

`messagesApi`

Retrieve and manage user messages and unread counts.

`messagesApi.list()`, `messagesApi.unreadCount()`

`adminApi`

Comprehensive administrative tasks: system info, user/tenant/plan/webhook management, promotions, announcements, API keys, logs, financial data, and impersonation.

`adminApi.listUsers()`, `adminApi.createPlan(planData)`, `adminApi.getHealthMetrics()`, `adminApi.impersonateUser(userId)`

`plansApi`

Retrieve public plan information.

`plansApi.list()`

`bundlesApi`

Retrieve public credit bundle information.

`bundlesApi.list()`

`announcementsApi`

Retrieve public announcements.

`announcementsApi.list()`

`usageApi`

Record and summarize usage data for the current tenant.

`usageApi.record({ type, quantity })`, `usageApi.summary()`

`billingApi`

Handle billing operations like checkout, portal access, transaction listing, invoice retrieval, and subscription cancellation.

`billingApi.checkout({ planId })`, `billingApi.portal()`, `billingApi.listTransactions()`

`brandingApi`

Retrieve public branding configuration and custom pages.

`brandingApi.get()`, `brandingApi.getPublicPages()`

`brandingAdminApi`

Manage branding assets (logo, favicon), media, and custom pages.

`brandingAdminApi.update(config)`, `brandingAdminApi.uploadAsset(key, file)`, `brandingAdminApi.createPage(pageData)`

`pmApi`

Product management analytics: funnels, retention, engagement, KPIs, custom events, and event definitions.

`pmApi.getFunnel()`, `pmApi.getRetention()`, `pmApi.createEventDefinition(data)`

`telemetryApi`

Track anonymous and authenticated events for telemetry purposes.

`telemetryApi.trackAnonymous(data)`, `telemetryApi.trackEvent(data)`

The frontend application organizes its interactions with the backend through a centralized API client, which provides structured access to various backend functionalities. This client, defined in [`frontend/src/api/client.ts`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts), groups API calls into distinct, exported objects, each responsible for a specific domain. This organizational approach simplifies the management of backend communications, ensuring that different parts of the application can interact with relevant services without direct knowledge of underlying HTTP requests or endpoint paths.

For instance, [`authApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L115) encapsulates all user authentication flows, ranging from user registration and login to multi-factor authentication (MFA) challenges and OAuth integrations. Similarly, [`tenantApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L203) manages operations related to the current tenant, such as member listing, invitations, and activity logging. Administrative functions, like user and tenant management, configuration adjustments, and billing controls, are consolidated under [`adminApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L231).

Other specialized objects include [`billingApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L419) for user-facing payment and subscription management, [`brandingApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L437) for retrieving public branding configurations, and [`brandingAdminApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L447) for administrative control over branding elements. There are also objects like [`plansApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L393) and [`bundlesApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L399) for accessing publicly available product information, [`usageApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L411) for tracking and summarizing usage events, and [`telemetryApi`](https://github.com/jonradoff/lastsaas/blob/c692923ed98ee503f2de61180ff530a5b05f71a6/frontend/src/api/client.ts#L504) for collecting anonymous user interaction data. This modular structure helps maintain a clear separation of concerns and facilitates consistent access to backend services across the frontend.