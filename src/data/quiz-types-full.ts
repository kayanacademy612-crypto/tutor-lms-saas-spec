// Auto-generated from Tutor LMS source code extraction
// DO NOT EDIT — regenerate with scripts/mine-spec-data.py

export interface SpecQuizType {
  [key: string]: any
}

export const quizTypes: SpecQuizType[] = [
  {
    "id": "true_false",
    "name": "True/False",
    "isPro": false,
    "grading": "auto",
    "desc": "Binary choice",
    "csvSupport": true
  },
  {
    "id": "single_choice",
    "name": "Single Choice",
    "isPro": false,
    "grading": "auto",
    "desc": "One correct answer from options",
    "csvSupport": true
  },
  {
    "id": "multiple_choice",
    "name": "Multiple Choice",
    "isPro": false,
    "grading": "auto",
    "desc": "Multiple correct answers",
    "csvSupport": true
  },
  {
    "id": "fill_in_the_blank",
    "name": "Fill in the Blanks",
    "isPro": false,
    "grading": "auto",
    "desc": "{dash} placeholders",
    "csvSupport": true
  },
  {
    "id": "short_answer",
    "name": "Short Answer",
    "isPro": false,
    "grading": "auto",
    "desc": "Short text answer",
    "csvSupport": true
  },
  {
    "id": "open_ended",
    "name": "Open-Ended/Essay",
    "isPro": false,
    "grading": "manual",
    "desc": "Free-text, instructor grades",
    "csvSupport": true
  },
  {
    "id": "matching",
    "name": "Matching",
    "isPro": false,
    "grading": "auto",
    "desc": "Match left to right items",
    "csvSupport": true
  },
  {
    "id": "image_matching",
    "name": "Image Matching",
    "isPro": false,
    "grading": "auto",
    "desc": "Match labels to images",
    "csvSupport": true
  },
  {
    "id": "image_answering",
    "name": "Image Answering",
    "isPro": false,
    "grading": "auto",
    "desc": "Select image as answer",
    "csvSupport": true
  },
  {
    "id": "ordering",
    "name": "Ordering",
    "isPro": false,
    "grading": "auto",
    "desc": "Drag-drop correct order",
    "csvSupport": true
  },
  {
    "id": "draw_image",
    "name": "Image Marking",
    "isPro": true,
    "grading": "auto",
    "desc": "Draw region, student marks point",
    "csvSupport": false
  },
  {
    "id": "scale",
    "name": "Range",
    "isPro": true,
    "grading": "auto",
    "desc": "Select value in min/max range",
    "csvSupport": false
  },
  {
    "id": "pin_image",
    "name": "Pin",
    "isPro": true,
    "grading": "auto",
    "desc": "Pin point on image",
    "csvSupport": false
  }
]

export const quizTypesCount = quizTypes.length
