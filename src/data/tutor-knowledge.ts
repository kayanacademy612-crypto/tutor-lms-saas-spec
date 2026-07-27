// Auto-generated from Tutor LMS source code (free + Pro)
export interface TutorClass { name: string; path: string; classes: string[]; source: string; system: string; confidence: string }
export interface TutorModel { name: string; path: string; classes: string[]; constants: {name: string; value: string}[]; source: string; confidence: string }
export interface TutorAddon { name: string; path: string; files: number; source: string; confidence: string }
export interface TutorFile { name: string; path: string; source: string; confidence: string }
export interface TutorShortcode { name: string; source: string; confidence: string }

export const tutorSummary = {
  "totalPhpFilesFree": 636,
  "totalPhpFilesPro": 1618,
  "classesFree": 61,
  "classesPro": 28,
  "models": 16,
  "addons": 29,
  "apiControllers": 14,
  "emailTemplates": 54,
  "shortcodes": 9
}
export const tutorClassesFree: TutorClass[] = [
  {
    "name": "Addons",
    "path": "tutor/classes/Addons.php",
    "classes": [
      "Addons"
    ],
    "source": "tutor/classes/Addons.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Admin",
    "path": "tutor/classes/Admin.php",
    "classes": [
      "Admin"
    ],
    "source": "tutor/classes/Admin.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Ajax",
    "path": "tutor/classes/Ajax.php",
    "classes": [
      "Ajax"
    ],
    "source": "tutor/classes/Ajax.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Announcements",
    "path": "tutor/classes/Announcements.php",
    "classes": [
      "Announcements"
    ],
    "source": "tutor/classes/Announcements.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Assets",
    "path": "tutor/classes/Assets.php",
    "classes": [
      "Assets"
    ],
    "source": "tutor/classes/Assets.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Backend_Page_Trait",
    "path": "tutor/classes/Backend_Page_Trait.php",
    "classes": [],
    "source": "tutor/classes/Backend_Page_Trait.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "BaseController",
    "path": "tutor/classes/BaseController.php",
    "classes": [],
    "source": "tutor/classes/BaseController.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Config",
    "path": "tutor/classes/Config.php",
    "classes": [
      "Config"
    ],
    "source": "tutor/classes/Config.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Container",
    "path": "tutor/classes/Container.php",
    "classes": [
      "Container"
    ],
    "source": "tutor/classes/Container.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Course",
    "path": "tutor/classes/Course.php",
    "classes": [
      "Course"
    ],
    "source": "tutor/classes/Course.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Course_Embed",
    "path": "tutor/classes/Course_Embed.php",
    "classes": [
      "Course_Embed"
    ],
    "source": "tutor/classes/Course_Embed.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Course_Filter",
    "path": "tutor/classes/Course_Filter.php",
    "classes": [
      "Course_Filter"
    ],
    "source": "tutor/classes/Course_Filter.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Course_List",
    "path": "tutor/classes/Course_List.php",
    "classes": [
      "Course_List"
    ],
    "source": "tutor/classes/Course_List.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Course_Settings_Tabs",
    "path": "tutor/classes/Course_Settings_Tabs.php",
    "classes": [
      "Course_Settings_Tabs"
    ],
    "source": "tutor/classes/Course_Settings_Tabs.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Course_Widget",
    "path": "tutor/classes/Course_Widget.php",
    "classes": [
      "Course_Widget"
    ],
    "source": "tutor/classes/Course_Widget.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Custom_Validation",
    "path": "tutor/classes/Custom_Validation.php",
    "classes": [],
    "source": "tutor/classes/Custom_Validation.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Dashboard",
    "path": "tutor/classes/Dashboard.php",
    "classes": [
      "Dashboard"
    ],
    "source": "tutor/classes/Dashboard.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Earnings",
    "path": "tutor/classes/Earnings.php",
    "classes": [
      "Earnings"
    ],
    "source": "tutor/classes/Earnings.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "FormHandler",
    "path": "tutor/classes/FormHandler.php",
    "classes": [
      "FormHandler"
    ],
    "source": "tutor/classes/FormHandler.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Frontend",
    "path": "tutor/classes/Frontend.php",
    "classes": [
      "Frontend"
    ],
    "source": "tutor/classes/Frontend.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Gutenberg",
    "path": "tutor/classes/Gutenberg.php",
    "classes": [
      "Gutenberg"
    ],
    "source": "tutor/classes/Gutenberg.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Icon",
    "path": "tutor/classes/Icon.php",
    "classes": [],
    "source": "tutor/classes/Icon.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Input",
    "path": "tutor/classes/Input.php",
    "classes": [
      "Input"
    ],
    "source": "tutor/classes/Input.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Instructor",
    "path": "tutor/classes/Instructor.php",
    "classes": [
      "Instructor"
    ],
    "source": "tutor/classes/Instructor.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Instructors_List",
    "path": "tutor/classes/Instructors_List.php",
    "classes": [
      "Instructors_List"
    ],
    "source": "tutor/classes/Instructors_List.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Lesson",
    "path": "tutor/classes/Lesson.php",
    "classes": [
      "Lesson"
    ],
    "source": "tutor/classes/Lesson.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Options_V2",
    "path": "tutor/classes/Options_V2.php",
    "classes": [
      "Options_V2"
    ],
    "source": "tutor/classes/Options_V2.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Permalink",
    "path": "tutor/classes/Permalink.php",
    "classes": [
      "Permalink"
    ],
    "source": "tutor/classes/Permalink.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Post_types",
    "path": "tutor/classes/Post_types.php",
    "classes": [
      "Post_types"
    ],
    "source": "tutor/classes/Post_types.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Private_Course_Access",
    "path": "tutor/classes/Private_Course_Access.php",
    "classes": [
      "Private_Course_Access"
    ],
    "source": "tutor/classes/Private_Course_Access.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Q_And_A",
    "path": "tutor/classes/Q_And_A.php",
    "classes": [
      "Q_And_A"
    ],
    "source": "tutor/classes/Q_And_A.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Question_Answers_List",
    "path": "tutor/classes/Question_Answers_List.php",
    "classes": [
      "Question_Answers_List"
    ],
    "source": "tutor/classes/Question_Answers_List.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Quiz",
    "path": "tutor/classes/Quiz.php",
    "classes": [
      "Quiz"
    ],
    "source": "tutor/classes/Quiz.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "QuizBuilder",
    "path": "tutor/classes/QuizBuilder.php",
    "classes": [
      "QuizBuilder"
    ],
    "source": "tutor/classes/QuizBuilder.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Quiz_Attempts_List",
    "path": "tutor/classes/Quiz_Attempts_List.php",
    "classes": [
      "Quiz_Attempts_List"
    ],
    "source": "tutor/classes/Quiz_Attempts_List.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "RestAPI",
    "path": "tutor/classes/RestAPI.php",
    "classes": [
      "RestAPI"
    ],
    "source": "tutor/classes/RestAPI.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Reviews",
    "path": "tutor/classes/Reviews.php",
    "classes": [
      "Reviews"
    ],
    "source": "tutor/classes/Reviews.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Rewrite_Rules",
    "path": "tutor/classes/Rewrite_Rules.php",
    "classes": [
      "Rewrite_Rules"
    ],
    "source": "tutor/classes/Rewrite_Rules.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "SampleCourse",
    "path": "tutor/classes/SampleCourse.php",
    "classes": [
      "SampleCourse"
    ],
    "source": "tutor/classes/SampleCourse.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Shortcode",
    "path": "tutor/classes/Shortcode.php",
    "classes": [
      "Shortcode"
    ],
    "source": "tutor/classes/Shortcode.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Singleton",
    "path": "tutor/classes/Singleton.php",
    "classes": [],
    "source": "tutor/classes/Singleton.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Student",
    "path": "tutor/classes/Student.php",
    "classes": [
      "Student"
    ],
    "source": "tutor/classes/Student.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Students_List",
    "path": "tutor/classes/Students_List.php",
    "classes": [
      "Students_List"
    ],
    "source": "tutor/classes/Students_List.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Taxonomies",
    "path": "tutor/classes/Taxonomies.php",
    "classes": [
      "Taxonomies"
    ],
    "source": "tutor/classes/Taxonomies.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Template",
    "path": "tutor/classes/Template.php",
    "classes": [
      "Template"
    ],
    "source": "tutor/classes/Template.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Theme_Compatibility",
    "path": "tutor/classes/Theme_Compatibility.php",
    "classes": [
      "Theme_Compatibility"
    ],
    "source": "tutor/classes/Theme_Compatibility.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Tools",
    "path": "tutor/classes/Tools.php",
    "classes": [
      "Tools"
    ],
    "source": "tutor/classes/Tools.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Tools_V2",
    "path": "tutor/classes/Tools_V2.php",
    "classes": [
      "Tools_V2"
    ],
    "source": "tutor/classes/Tools_V2.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Tutor",
    "path": "tutor/classes/Tutor.php",
    "classes": [],
    "source": "tutor/classes/Tutor.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "TutorEDD",
    "path": "tutor/classes/TutorEDD.php",
    "classes": [
      "TutorEDD"
    ],
    "source": "tutor/classes/TutorEDD.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Tutor_Base",
    "path": "tutor/classes/Tutor_Base.php",
    "classes": [
      "Tutor_Base"
    ],
    "source": "tutor/classes/Tutor_Base.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Tutor_Setup",
    "path": "tutor/classes/Tutor_Setup.php",
    "classes": [
      "Tutor_Setup"
    ],
    "source": "tutor/classes/Tutor_Setup.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Upgrader",
    "path": "tutor/classes/Upgrader.php",
    "classes": [
      "Upgrader"
    ],
    "source": "tutor/classes/Upgrader.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "User",
    "path": "tutor/classes/User.php",
    "classes": [
      "User"
    ],
    "source": "tutor/classes/User.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "UserPreference",
    "path": "tutor/classes/UserPreference.php",
    "classes": [
      "UserPreference"
    ],
    "source": "tutor/classes/UserPreference.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Utils",
    "path": "tutor/classes/Utils.php",
    "classes": [
      "Utils"
    ],
    "source": "tutor/classes/Utils.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Video_Stream",
    "path": "tutor/classes/Video_Stream.php",
    "classes": [
      "Video_Stream"
    ],
    "source": "tutor/classes/Video_Stream.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "WhatsNew",
    "path": "tutor/classes/WhatsNew.php",
    "classes": [
      "WhatsNew"
    ],
    "source": "tutor/classes/WhatsNew.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Withdraw",
    "path": "tutor/classes/Withdraw.php",
    "classes": [
      "Withdraw"
    ],
    "source": "tutor/classes/Withdraw.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "Withdraw_Requests_List",
    "path": "tutor/classes/Withdraw_Requests_List.php",
    "classes": [
      "Withdraw_Requests_List"
    ],
    "source": "tutor/classes/Withdraw_Requests_List.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  },
  {
    "name": "WooCommerce",
    "path": "tutor/classes/WooCommerce.php",
    "classes": [
      "WooCommerce"
    ],
    "source": "tutor/classes/WooCommerce.php",
    "system": "tutor-free",
    "confidence": "confirmed"
  }
]
export const tutorClassesPro: TutorClass[] = [
  {
    "name": "AddonBaseHelper",
    "path": "tutor-pro/classes/AddonBaseHelper.php",
    "classes": [],
    "source": "tutor-pro/classes/AddonBaseHelper.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Admin",
    "path": "tutor-pro/classes/Admin.php",
    "classes": [
      "Admin"
    ],
    "source": "tutor-pro/classes/Admin.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Assets",
    "path": "tutor-pro/classes/Assets.php",
    "classes": [
      "Assets"
    ],
    "source": "tutor-pro/classes/Assets.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "ChangeEmail",
    "path": "tutor-pro/classes/ChangeEmail.php",
    "classes": [
      "ChangeEmail"
    ],
    "source": "tutor-pro/classes/ChangeEmail.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "ContentDuplicator",
    "path": "tutor-pro/classes/ContentDuplicator.php",
    "classes": [
      "ContentDuplicator"
    ],
    "source": "tutor-pro/classes/ContentDuplicator.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "ContentSecurity",
    "path": "tutor-pro/classes/ContentSecurity.php",
    "classes": [
      "ContentSecurity"
    ],
    "source": "tutor-pro/classes/ContentSecurity.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "CourseComingSoon",
    "path": "tutor-pro/classes/CourseComingSoon.php",
    "classes": [
      "CourseComingSoon"
    ],
    "source": "tutor-pro/classes/CourseComingSoon.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Course_Duplicator",
    "path": "tutor-pro/classes/Course_Duplicator.php",
    "classes": [
      "Course_Duplicator"
    ],
    "source": "tutor-pro/classes/Course_Duplicator.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Dashboard",
    "path": "tutor-pro/classes/Dashboard.php",
    "classes": [
      "Dashboard"
    ],
    "source": "tutor-pro/classes/Dashboard.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "DeviceManagement",
    "path": "tutor-pro/classes/DeviceManagement.php",
    "classes": [
      "DeviceManagement"
    ],
    "source": "tutor-pro/classes/DeviceManagement.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "EmailVerification",
    "path": "tutor-pro/classes/EmailVerification.php",
    "classes": [
      "EmailVerification"
    ],
    "source": "tutor-pro/classes/EmailVerification.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Filters",
    "path": "tutor-pro/classes/Filters.php",
    "classes": [
      "Filters"
    ],
    "source": "tutor-pro/classes/Filters.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "General",
    "path": "tutor-pro/classes/General.php",
    "classes": [
      "General"
    ],
    "source": "tutor-pro/classes/General.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "GuestEmail",
    "path": "tutor-pro/classes/GuestEmail.php",
    "classes": [
      "GuestEmail"
    ],
    "source": "tutor-pro/classes/GuestEmail.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Init",
    "path": "tutor-pro/classes/Init.php",
    "classes": [
      "Init"
    ],
    "source": "tutor-pro/classes/Init.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Instructor",
    "path": "tutor-pro/classes/Instructor.php",
    "classes": [
      "Instructor"
    ],
    "source": "tutor-pro/classes/Instructor.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Instructor_Percentage",
    "path": "tutor-pro/classes/Instructor_Percentage.php",
    "classes": [
      "Instructor_Percentage"
    ],
    "source": "tutor-pro/classes/Instructor_Percentage.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "LessonNotes",
    "path": "tutor-pro/classes/LessonNotes.php",
    "classes": [
      "LessonNotes"
    ],
    "source": "tutor-pro/classes/LessonNotes.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Mailer",
    "path": "tutor-pro/classes/Mailer.php",
    "classes": [
      "Mailer"
    ],
    "source": "tutor-pro/classes/Mailer.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "NotificationPreference",
    "path": "tutor-pro/classes/NotificationPreference.php",
    "classes": [
      "NotificationPreference"
    ],
    "source": "tutor-pro/classes/NotificationPreference.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "ProgressReset",
    "path": "tutor-pro/classes/ProgressReset.php",
    "classes": [
      "ProgressReset"
    ],
    "source": "tutor-pro/classes/ProgressReset.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Quiz",
    "path": "tutor-pro/classes/Quiz.php",
    "classes": [
      "Quiz"
    ],
    "source": "tutor-pro/classes/Quiz.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "QuizImageStorage",
    "path": "tutor-pro/classes/QuizImageStorage.php",
    "classes": [
      "QuizImageStorage"
    ],
    "source": "tutor-pro/classes/QuizImageStorage.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "RestAPI",
    "path": "tutor-pro/classes/RestAPI.php",
    "classes": [
      "RestAPI"
    ],
    "source": "tutor-pro/classes/RestAPI.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Shortcode",
    "path": "tutor-pro/classes/Shortcode.php",
    "classes": [
      "Shortcode"
    ],
    "source": "tutor-pro/classes/Shortcode.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Upgrader",
    "path": "tutor-pro/classes/Upgrader.php",
    "classes": [
      "Upgrader"
    ],
    "source": "tutor-pro/classes/Upgrader.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "VisibilityFieldControl",
    "path": "tutor-pro/classes/VisibilityFieldControl.php",
    "classes": [
      "VisibilityFieldControl"
    ],
    "source": "tutor-pro/classes/VisibilityFieldControl.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  },
  {
    "name": "Webinar",
    "path": "tutor-pro/classes/Webinar.php",
    "classes": [
      "Webinar"
    ],
    "source": "tutor-pro/classes/Webinar.php",
    "system": "tutor-pro",
    "confidence": "confirmed"
  }
]
export const tutorModels: TutorModel[] = [
  {
    "name": "BaseModel",
    "path": "tutor/models/BaseModel.php",
    "classes": [],
    "constants": [],
    "source": "tutor/models/BaseModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "BillingModel",
    "path": "tutor/models/BillingModel.php",
    "classes": [
      "BillingModel"
    ],
    "constants": [],
    "source": "tutor/models/BillingModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "CartItemModel",
    "path": "tutor/models/CartItemModel.php",
    "classes": [
      "CartItemModel"
    ],
    "constants": [],
    "source": "tutor/models/CartItemModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "CartModel",
    "path": "tutor/models/CartModel.php",
    "classes": [
      "CartModel"
    ],
    "constants": [],
    "source": "tutor/models/CartModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "CouponModel",
    "path": "tutor/models/CouponModel.php",
    "classes": [
      "CouponModel"
    ],
    "constants": [
      {
        "name": "STATUS_ACTIVE",
        "value": "active"
      },
      {
        "name": "STATUS_INACTIVE",
        "value": "inactive"
      },
      {
        "name": "STATUS_TRASH",
        "value": "trash"
      },
      {
        "name": "STATUS_EXPIRED",
        "value": "expired"
      },
      {
        "name": "STATUS_SCHEDULED",
        "value": "scheduled"
      },
      {
        "name": "TYPE_CODE",
        "value": "code"
      },
      {
        "name": "TYPE_AUTOMATIC",
        "value": "automatic"
      },
      {
        "name": "APPLIES_TO_ALL_COURSES_AND_BUNDLES",
        "value": "all_courses_and_bundles"
      },
      {
        "name": "APPLIES_TO_ALL_COURSES",
        "value": "all_courses"
      },
      {
        "name": "APPLIES_TO_ALL_BUNDLES",
        "value": "all_bundles"
      },
      {
        "name": "APPLIES_TO_SPECIFIC_COURSES",
        "value": "specific_courses"
      },
      {
        "name": "APPLIES_TO_SPECIFIC_BUNDLES",
        "value": "specific_bundles"
      },
      {
        "name": "APPLIES_TO_SPECIFIC_CATEGORY",
        "value": "specific_category"
      },
      {
        "name": "APPLIES_TO_ALL_MEMBERSHIP_PLANS",
        "value": "all_membership_plans"
      },
      {
        "name": "APPLIES_TO_SPECIFIC_MEMBERSHIP_PLANS",
        "value": "specific_membership_plans"
      },
      {
        "name": "REQUIREMENT_NO_MINIMUM",
        "value": "no_minimum"
      },
      {
        "name": "REQUIREMENT_MINIMUM_PURCHASE",
        "value": "minimum_purchase"
      },
      {
        "name": "REQUIREMENT_MINIMUM_QUANTITY",
        "value": "minimum_quantity"
      },
      {
        "name": "DISCOUNT_TYPE_FLAT",
        "value": "flat"
      },
      {
        "name": "DISCOUNT_TYPE_PERCENTAGE",
        "value": "percentage"
      }
    ],
    "source": "tutor/models/CouponModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "CourseModel",
    "path": "tutor/models/CourseModel.php",
    "classes": [
      "CourseModel"
    ],
    "constants": [
      {
        "name": "POST_TYPE",
        "value": "courses"
      },
      {
        "name": "COURSE_CATEGORY",
        "value": "course-category"
      },
      {
        "name": "COURSE_TAG",
        "value": "course-tag"
      },
      {
        "name": "STATUS_PUBLISH",
        "value": "publish"
      },
      {
        "name": "STATUS_DRAFT",
        "value": "draft"
      },
      {
        "name": "STATUS_AUTO_DRAFT",
        "value": "auto-draft"
      },
      {
        "name": "STATUS_PENDING",
        "value": "pending"
      },
      {
        "name": "STATUS_PRIVATE",
        "value": "private"
      },
      {
        "name": "STATUS_FUTURE",
        "value": "future"
      },
      {
        "name": "STATUS_TRASH",
        "value": "trash"
      },
      {
        "name": "MODE_FLEXIBLE",
        "value": "flexible"
      },
      {
        "name": "MODE_STRICT",
        "value": "strict"
      },
      {
        "name": "ATTACHMENT_META_KEY",
        "value": "_tutor_attachments"
      },
      {
        "name": "BENEFITS_META_KEY",
        "value": "_tutor_course_benefits"
      },
      {
        "name": "COURSE_COMPLETED",
        "value": "course_completed"
      }
    ],
    "source": "tutor/models/CourseModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "EnrollmentModel",
    "path": "tutor/models/EnrollmentModel.php",
    "classes": [
      "EnrollmentModel"
    ],
    "constants": [
      {
        "name": "STATUS_COMPLETED",
        "value": "completed"
      },
      {
        "name": "STATUS_PENDING",
        "value": "pending"
      },
      {
        "name": "STATUS_CANCEL",
        "value": "cancel"
      },
      {
        "name": "POST_TYPE",
        "value": "tutor_enrolled"
      },
      {
        "name": "ENROLLMENT_ORDER_ID_META",
        "value": "_tutor_enrolled_by_order_id"
      },
      {
        "name": "ENROLLMENT_PRODUCT_ID_META",
        "value": "_tutor_enrolled_by_product_id"
      }
    ],
    "source": "tutor/models/EnrollmentModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "LessonModel",
    "path": "tutor/models/LessonModel.php",
    "classes": [
      "LessonModel"
    ],
    "constants": [],
    "source": "tutor/models/LessonModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "OrderActivitiesModel",
    "path": "tutor/models/OrderActivitiesModel.php",
    "classes": [
      "OrderActivitiesModel"
    ],
    "constants": [
      {
        "name": "META_KEY_HISTORY",
        "value": "history"
      },
      {
        "name": "META_KEY_REFUND",
        "value": "refund"
      },
      {
        "name": "META_KEY_PARTIALLY_REFUND",
        "value": "partially-refund"
      },
      {
        "name": "META_KEY_COMMENT",
        "value": "comment"
      },
      {
        "name": "META_KEY_CANCEL_REASON",
        "value": "cancel-reason"
      }
    ],
    "source": "tutor/models/OrderActivitiesModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "OrderItemMetaModel",
    "path": "tutor/models/OrderItemMetaModel.php",
    "classes": [
      "OrderItemMetaModel"
    ],
    "constants": [],
    "source": "tutor/models/OrderItemMetaModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "OrderItemModel",
    "path": "tutor/models/OrderItemModel.php",
    "classes": [
      "OrderItemModel"
    ],
    "constants": [],
    "source": "tutor/models/OrderItemModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "OrderMetaModel",
    "path": "tutor/models/OrderMetaModel.php",
    "classes": [
      "OrderMetaModel"
    ],
    "constants": [],
    "source": "tutor/models/OrderMetaModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "OrderModel",
    "path": "tutor/models/OrderModel.php",
    "classes": [
      "OrderModel"
    ],
    "constants": [
      {
        "name": "ORDER_INCOMPLETE",
        "value": "incomplete"
      },
      {
        "name": "ORDER_COMPLETED",
        "value": "completed"
      },
      {
        "name": "ORDER_CANCELLED",
        "value": "cancelled"
      },
      {
        "name": "ORDER_TRASH",
        "value": "trash"
      },
      {
        "name": "ORDER_PENDING",
        "value": "pending"
      },
      {
        "name": "PAYMENT_PAID",
        "value": "paid"
      },
      {
        "name": "PAYMENT_FAILED",
        "value": "failed"
      },
      {
        "name": "PAYMENT_UNPAID",
        "value": "unpaid"
      },
      {
        "name": "PAYMENT_REFUNDED",
        "value": "refunded"
      },
      {
        "name": "PAYMENT_PARTIALLY_REFUNDED",
        "value": "partially-refunded"
      },
      {
        "name": "PAYMENT_PENDING",
        "value": "pending"
      },
      {
        "name": "PAYMENT_METHOD_MANUAL",
        "value": "manual"
      },
      {
        "name": "PAYMENT_METHOD_FREE",
        "value": "free"
      },
      {
        "name": "META_KEY_HISTORY",
        "value": "history"
      },
      {
        "name": "META_KEY_REFUND",
        "value": "refund"
      },
      {
        "name": "META_KEY_ORDER_ID",
        "value": "tutor_order_id_"
      },
      {
        "name": "META_KEY_BILLING_ADDRESS",
        "value": "billing_address"
      },
      {
        "name": "META_ENROLLMENT_FEE",
        "value": "plan_enrollment_fee"
      },
      {
        "name": "META_TRIAL_FEE",
        "value": "plan_trial_fee"
      },
      {
        "name": "META_PLAN_INFO",
        "value": "plan_info"
      }
    ],
    "source": "tutor/models/OrderModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "QuizModel",
    "path": "tutor/models/QuizModel.php",
    "classes": [
      "QuizModel"
    ],
    "constants": [
      {
        "name": "ATTEMPT_STARTED",
        "value": "attempt_started"
      },
      {
        "name": "ATTEMPT_ENDED",
        "value": "attempt_ended"
      },
      {
        "name": "REVIEW_REQUIRED",
        "value": "review_required"
      },
      {
        "name": "ATTEMPT_TIMEOUT",
        "value": "attempt_timeout"
      },
      {
        "name": "RESULT_PASS",
        "value": "pass"
      },
      {
        "name": "RESULT_FAIL",
        "value": "fail"
      },
      {
        "name": "RESULT_PENDING",
        "value": "pending"
      },
      {
        "name": "ATTEMPTS_TABLE",
        "value": "tutor_quiz_attempts"
      },
      {
        "name": "QUESTION_TYPE_TRUE_FALSE",
        "value": "true_false"
      },
      {
        "name": "QUESTION_TYPE_SINGLE_CHOICE",
        "value": "single_choice"
      },
      {
        "name": "QUESTION_TYPE_MULTIPLE_CHOICE",
        "value": "multiple_choice"
      },
      {
        "name": "QUESTION_TYPE_OPEN_ENDED",
        "value": "open_ended"
      },
      {
        "name": "QUESTION_TYPE_FILL_IN_THE_BLANK",
        "value": "fill_in_the_blank"
      },
      {
        "name": "QUESTION_TYPE_SHORT_ANSWER",
        "value": "short_answer"
      },
      {
        "name": "QUESTION_TYPE_MATCHING",
        "value": "matching"
      },
      {
        "name": "QUESTION_TYPE_IMAGE_MATCHING",
        "value": "image_matching"
      },
      {
        "name": "QUESTION_TYPE_IMAGE_ANSWERING",
        "value": "image_answering"
      },
      {
        "name": "QUESTION_TYPE_ORDERING",
        "value": "ordering"
      },
      {
        "name": "QUESTION_TYPE_DRAW_IMAGE",
        "value": "draw_image"
      },
      {
        "name": "QUESTION_TYPE_SCALE",
        "value": "scale"
      }
    ],
    "source": "tutor/models/QuizModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "UserModel",
    "path": "tutor/models/UserModel.php",
    "classes": [
      "UserModel"
    ],
    "constants": [],
    "source": "tutor/models/UserModel.php",
    "confidence": "confirmed"
  },
  {
    "name": "WithdrawModel",
    "path": "tutor/models/WithdrawModel.php",
    "classes": [
      "WithdrawModel"
    ],
    "constants": [
      {
        "name": "STATUS_PENDING",
        "value": "pending"
      },
      {
        "name": "STATUS_APPROVED",
        "value": "approved"
      },
      {
        "name": "STATUS_REJECTED",
        "value": "rejected"
      },
      {
        "name": "METHOD_BANK_TRANSFER_WITHDRAW",
        "value": "bank_transfer_withdraw"
      },
      {
        "name": "METHOD_PAYPAL_WITHDRAW",
        "value": "paypal_withdraw"
      },
      {
        "name": "METHOD_ECHECK_WITHDRAW",
        "value": "echeck_withdraw"
      }
    ],
    "source": "tutor/models/WithdrawModel.php",
    "confidence": "confirmed"
  }
]
export const tutorAddons: TutorAddon[] = [
  {
    "name": "auth",
    "path": "tutor-pro/addons/auth/",
    "files": 16,
    "source": "tutor-pro/addons/auth/",
    "confidence": "confirmed"
  },
  {
    "name": "buddypress",
    "path": "tutor-pro/addons/buddypress/",
    "files": 5,
    "source": "tutor-pro/addons/buddypress/",
    "confidence": "confirmed"
  },
  {
    "name": "calendar",
    "path": "tutor-pro/addons/calendar/",
    "files": 4,
    "source": "tutor-pro/addons/calendar/",
    "confidence": "confirmed"
  },
  {
    "name": "content-bank",
    "path": "tutor-pro/addons/content-bank/",
    "files": 19,
    "source": "tutor-pro/addons/content-bank/",
    "confidence": "confirmed"
  },
  {
    "name": "content-drip",
    "path": "tutor-pro/addons/content-drip/",
    "files": 5,
    "source": "tutor-pro/addons/content-drip/",
    "confidence": "confirmed"
  },
  {
    "name": "course-bundle",
    "path": "tutor-pro/addons/course-bundle/",
    "files": 28,
    "source": "tutor-pro/addons/course-bundle/",
    "confidence": "confirmed"
  },
  {
    "name": "enrollments",
    "path": "tutor-pro/addons/enrollments/",
    "files": 10,
    "source": "tutor-pro/addons/enrollments/",
    "confidence": "confirmed"
  },
  {
    "name": "google-classroom",
    "path": "tutor-pro/addons/google-classroom/",
    "files": 15,
    "source": "tutor-pro/addons/google-classroom/",
    "confidence": "confirmed"
  },
  {
    "name": "google-meet",
    "path": "tutor-pro/addons/google-meet/",
    "files": 48,
    "source": "tutor-pro/addons/google-meet/",
    "confidence": "confirmed"
  },
  {
    "name": "gradebook",
    "path": "tutor-pro/addons/gradebook/",
    "files": 8,
    "source": "tutor-pro/addons/gradebook/",
    "confidence": "confirmed"
  },
  {
    "name": "h5p",
    "path": "tutor-pro/addons/h5p/",
    "files": 32,
    "source": "tutor-pro/addons/h5p/",
    "confidence": "confirmed"
  },
  {
    "name": "pmpro",
    "path": "tutor-pro/addons/pmpro/",
    "files": 7,
    "source": "tutor-pro/addons/pmpro/",
    "confidence": "confirmed"
  },
  {
    "name": "quiz-import-export",
    "path": "tutor-pro/addons/quiz-import-export/",
    "files": 3,
    "source": "tutor-pro/addons/quiz-import-export/",
    "confidence": "confirmed"
  },
  {
    "name": "restrict-content-pro",
    "path": "tutor-pro/addons/restrict-content-pro/",
    "files": 3,
    "source": "tutor-pro/addons/restrict-content-pro/",
    "confidence": "confirmed"
  },
  {
    "name": "social-login",
    "path": "tutor-pro/addons/social-login/",
    "files": 9,
    "source": "tutor-pro/addons/social-login/",
    "confidence": "confirmed"
  },
  {
    "name": "subscription",
    "path": "tutor-pro/addons/subscription/",
    "files": 42,
    "source": "tutor-pro/addons/subscription/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-assignments",
    "path": "tutor-pro/addons/tutor-assignments/",
    "files": 21,
    "source": "tutor-pro/addons/tutor-assignments/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-certificate",
    "path": "tutor-pro/addons/tutor-certificate/",
    "files": 30,
    "source": "tutor-pro/addons/tutor-certificate/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-course-attachments",
    "path": "tutor-pro/addons/tutor-course-attachments/",
    "files": 4,
    "source": "tutor-pro/addons/tutor-course-attachments/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-course-preview",
    "path": "tutor-pro/addons/tutor-course-preview/",
    "files": 3,
    "source": "tutor-pro/addons/tutor-course-preview/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-email",
    "path": "tutor-pro/addons/tutor-email/",
    "files": 12,
    "source": "tutor-pro/addons/tutor-email/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-multi-instructors",
    "path": "tutor-pro/addons/tutor-multi-instructors/",
    "files": 3,
    "source": "tutor-pro/addons/tutor-multi-instructors/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-notifications",
    "path": "tutor-pro/addons/tutor-notifications/",
    "files": 14,
    "source": "tutor-pro/addons/tutor-notifications/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-prerequisites",
    "path": "tutor-pro/addons/tutor-prerequisites/",
    "files": 4,
    "source": "tutor-pro/addons/tutor-prerequisites/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-report",
    "path": "tutor-pro/addons/tutor-report/",
    "files": 39,
    "source": "tutor-pro/addons/tutor-report/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-weglot",
    "path": "tutor-pro/addons/tutor-weglot/",
    "files": 1,
    "source": "tutor-pro/addons/tutor-weglot/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-wpml",
    "path": "tutor-pro/addons/tutor-wpml/",
    "files": 3,
    "source": "tutor-pro/addons/tutor-wpml/",
    "confidence": "confirmed"
  },
  {
    "name": "tutor-zoom",
    "path": "tutor-pro/addons/tutor-zoom/",
    "files": 35,
    "source": "tutor-pro/addons/tutor-zoom/",
    "confidence": "confirmed"
  },
  {
    "name": "wc-subscriptions",
    "path": "tutor-pro/addons/wc-subscriptions/",
    "files": 3,
    "source": "tutor-pro/addons/wc-subscriptions/",
    "confidence": "confirmed"
  }
]
export const tutorApiControllers: TutorFile[] = [
  {
    "name": "AssignmentController",
    "path": "tutor-pro/rest-api/Controllers/AssignmentController.php",
    "source": "tutor-pro/rest-api/Controllers/AssignmentController.php",
    "confidence": "confirmed"
  },
  {
    "name": "BaseController",
    "path": "tutor-pro/rest-api/Controllers/BaseController.php",
    "source": "tutor-pro/rest-api/Controllers/BaseController.php",
    "confidence": "confirmed"
  },
  {
    "name": "CourseController",
    "path": "tutor-pro/rest-api/Controllers/CourseController.php",
    "source": "tutor-pro/rest-api/Controllers/CourseController.php",
    "confidence": "confirmed"
  },
  {
    "name": "EnrollmentController",
    "path": "tutor-pro/rest-api/Controllers/EnrollmentController.php",
    "source": "tutor-pro/rest-api/Controllers/EnrollmentController.php",
    "confidence": "confirmed"
  },
  {
    "name": "LessonController",
    "path": "tutor-pro/rest-api/Controllers/LessonController.php",
    "source": "tutor-pro/rest-api/Controllers/LessonController.php",
    "confidence": "confirmed"
  },
  {
    "name": "QAndAController",
    "path": "tutor-pro/rest-api/Controllers/QAndAController.php",
    "source": "tutor-pro/rest-api/Controllers/QAndAController.php",
    "confidence": "confirmed"
  },
  {
    "name": "QuizAttemptController",
    "path": "tutor-pro/rest-api/Controllers/QuizAttemptController.php",
    "source": "tutor-pro/rest-api/Controllers/QuizAttemptController.php",
    "confidence": "confirmed"
  },
  {
    "name": "QuizController",
    "path": "tutor-pro/rest-api/Controllers/QuizController.php",
    "source": "tutor-pro/rest-api/Controllers/QuizController.php",
    "confidence": "confirmed"
  },
  {
    "name": "QuizQuestionController",
    "path": "tutor-pro/rest-api/Controllers/QuizQuestionController.php",
    "source": "tutor-pro/rest-api/Controllers/QuizQuestionController.php",
    "confidence": "confirmed"
  },
  {
    "name": "ReviewController",
    "path": "tutor-pro/rest-api/Controllers/ReviewController.php",
    "source": "tutor-pro/rest-api/Controllers/ReviewController.php",
    "confidence": "confirmed"
  },
  {
    "name": "StudentController",
    "path": "tutor-pro/rest-api/Controllers/StudentController.php",
    "source": "tutor-pro/rest-api/Controllers/StudentController.php",
    "confidence": "confirmed"
  },
  {
    "name": "TopicController",
    "path": "tutor-pro/rest-api/Controllers/TopicController.php",
    "source": "tutor-pro/rest-api/Controllers/TopicController.php",
    "confidence": "confirmed"
  },
  {
    "name": "UserProfileController",
    "path": "tutor-pro/rest-api/Controllers/UserProfileController.php",
    "source": "tutor-pro/rest-api/Controllers/UserProfileController.php",
    "confidence": "confirmed"
  },
  {
    "name": "WishlistController",
    "path": "tutor-pro/rest-api/Controllers/WishlistController.php",
    "source": "tutor-pro/rest-api/Controllers/WishlistController.php",
    "confidence": "confirmed"
  }
]
export const tutorEmailTemplates: TutorFile[] = [
  {
    "name": "to_admin_course_updated",
    "path": "tutor-pro/templates/email/to_admin_course_updated.php",
    "source": "tutor-pro/templates/email/to_admin_course_updated.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_admin_default_config",
    "path": "tutor-pro/templates/email/to_admin_default_config.php",
    "source": "tutor-pro/templates/email/to_admin_default_config.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_admin_new_course_published",
    "path": "tutor-pro/templates/email/to_admin_new_course_published.php",
    "source": "tutor-pro/templates/email/to_admin_new_course_published.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_admin_new_course_submitted_for_review",
    "path": "tutor-pro/templates/email/to_admin_new_course_submitted_for_review.php",
    "source": "tutor-pro/templates/email/to_admin_new_course_submitted_for_review.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_admin_new_instructor_signup",
    "path": "tutor-pro/templates/email/to_admin_new_instructor_signup.php",
    "source": "tutor-pro/templates/email/to_admin_new_instructor_signup.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_admin_new_student_signup",
    "path": "tutor-pro/templates/email/to_admin_new_student_signup.php",
    "source": "tutor-pro/templates/email/to_admin_new_student_signup.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_admin_new_withdrawal_request",
    "path": "tutor-pro/templates/email/to_admin_new_withdrawal_request.php",
    "source": "tutor-pro/templates/email/to_admin_new_withdrawal_request.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_admin_student_submitted_review",
    "path": "tutor-pro/templates/email/to_admin_student_submitted_review.php",
    "source": "tutor-pro/templates/email/to_admin_student_submitted_review.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_all_forgot_password",
    "path": "tutor-pro/templates/email/to_all_forgot_password.php",
    "source": "tutor-pro/templates/email/to_all_forgot_password.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_guest_password_reset",
    "path": "tutor-pro/templates/email/to_guest_password_reset.php",
    "source": "tutor-pro/templates/email/to_guest_password_reset.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_asked_question_by_student",
    "path": "tutor-pro/templates/email/to_instructor_asked_question_by_student.php",
    "source": "tutor-pro/templates/email/to_instructor_asked_question_by_student.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_become_application_approved",
    "path": "tutor-pro/templates/email/to_instructor_become_application_approved.php",
    "source": "tutor-pro/templates/email/to_instructor_become_application_approved.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_become_application_received",
    "path": "tutor-pro/templates/email/to_instructor_become_application_received.php",
    "source": "tutor-pro/templates/email/to_instructor_become_application_received.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_become_application_rejected",
    "path": "tutor-pro/templates/email/to_instructor_become_application_rejected.php",
    "source": "tutor-pro/templates/email/to_instructor_become_application_rejected.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_commented_student",
    "path": "tutor-pro/templates/email/to_instructor_commented_student.php",
    "source": "tutor-pro/templates/email/to_instructor_commented_student.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_course_accepted",
    "path": "tutor-pro/templates/email/to_instructor_course_accepted.php",
    "source": "tutor-pro/templates/email/to_instructor_course_accepted.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_course_completed",
    "path": "tutor-pro/templates/email/to_instructor_course_completed.php",
    "source": "tutor-pro/templates/email/to_instructor_course_completed.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_course_enrolled",
    "path": "tutor-pro/templates/email/to_instructor_course_enrolled.php",
    "source": "tutor-pro/templates/email/to_instructor_course_enrolled.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_course_rejected",
    "path": "tutor-pro/templates/email/to_instructor_course_rejected.php",
    "source": "tutor-pro/templates/email/to_instructor_course_rejected.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_lesson_completed",
    "path": "tutor-pro/templates/email/to_instructor_lesson_completed.php",
    "source": "tutor-pro/templates/email/to_instructor_lesson_completed.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_new_assignment_published",
    "path": "tutor-pro/templates/email/to_instructor_new_assignment_published.php",
    "source": "tutor-pro/templates/email/to_instructor_new_assignment_published.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_quiz_completed",
    "path": "tutor-pro/templates/email/to_instructor_quiz_completed.php",
    "source": "tutor-pro/templates/email/to_instructor_quiz_completed.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_student_submitted_assignment",
    "path": "tutor-pro/templates/email/to_instructor_student_submitted_assignment.php",
    "source": "tutor-pro/templates/email/to_instructor_student_submitted_assignment.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_student_submitted_review",
    "path": "tutor-pro/templates/email/to_instructor_student_submitted_review.php",
    "source": "tutor-pro/templates/email/to_instructor_student_submitted_review.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_withdrawal_request_approved",
    "path": "tutor-pro/templates/email/to_instructor_withdrawal_request_approved.php",
    "source": "tutor-pro/templates/email/to_instructor_withdrawal_request_approved.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_withdrawal_request_received",
    "path": "tutor-pro/templates/email/to_instructor_withdrawal_request_received.php",
    "source": "tutor-pro/templates/email/to_instructor_withdrawal_request_received.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_instructor_withdrawal_request_rejected",
    "path": "tutor-pro/templates/email/to_instructor_withdrawal_request_rejected.php",
    "source": "tutor-pro/templates/email/to_instructor_withdrawal_request_rejected.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_sender_gift_received_notification",
    "path": "tutor-pro/templates/email/to_sender_gift_received_notification.php",
    "source": "tutor-pro/templates/email/to_sender_gift_received_notification.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_announcement_updated",
    "path": "tutor-pro/templates/email/to_student_announcement_updated.php",
    "source": "tutor-pro/templates/email/to_student_announcement_updated.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_assignment_evaluate",
    "path": "tutor-pro/templates/email/to_student_assignment_evaluate.php",
    "source": "tutor-pro/templates/email/to_student_assignment_evaluate.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_comment_thread",
    "path": "tutor-pro/templates/email/to_student_comment_thread.php",
    "source": "tutor-pro/templates/email/to_student_comment_thread.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_course_completed",
    "path": "tutor-pro/templates/email/to_student_course_completed.php",
    "source": "tutor-pro/templates/email/to_student_course_completed.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_course_enrolled",
    "path": "tutor-pro/templates/email/to_student_course_enrolled.php",
    "source": "tutor-pro/templates/email/to_student_course_enrolled.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_enrollment_expired",
    "path": "tutor-pro/templates/email/to_student_enrollment_expired.php",
    "source": "tutor-pro/templates/email/to_student_enrollment_expired.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_feedback_submitted_for_quiz",
    "path": "tutor-pro/templates/email/to_student_feedback_submitted_for_quiz.php",
    "source": "tutor-pro/templates/email/to_student_feedback_submitted_for_quiz.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_inactive_student",
    "path": "tutor-pro/templates/email/to_student_inactive_student.php",
    "source": "tutor-pro/templates/email/to_student_inactive_student.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_new_announcement_posted",
    "path": "tutor-pro/templates/email/to_student_new_announcement_posted.php",
    "source": "tutor-pro/templates/email/to_student_new_announcement_posted.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_new_assignment_published",
    "path": "tutor-pro/templates/email/to_student_new_assignment_published.php",
    "source": "tutor-pro/templates/email/to_student_new_assignment_published.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_new_lesson_published",
    "path": "tutor-pro/templates/email/to_student_new_lesson_published.php",
    "source": "tutor-pro/templates/email/to_student_new_lesson_published.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_new_quiz_published",
    "path": "tutor-pro/templates/email/to_student_new_quiz_published.php",
    "source": "tutor-pro/templates/email/to_student_new_quiz_published.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_question_answered",
    "path": "tutor-pro/templates/email/to_student_question_answered.php",
    "source": "tutor-pro/templates/email/to_student_question_answered.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_quiz_completed",
    "path": "tutor-pro/templates/email/to_student_quiz_completed.php",
    "source": "tutor-pro/templates/email/to_student_quiz_completed.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_rate_course_and_instructor",
    "path": "tutor-pro/templates/email/to_student_rate_course_and_instructor.php",
    "source": "tutor-pro/templates/email/to_student_rate_course_and_instructor.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_remove_from_course",
    "path": "tutor-pro/templates/email/to_student_remove_from_course.php",
    "source": "tutor-pro/templates/email/to_student_remove_from_course.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_subscription_activated",
    "path": "tutor-pro/templates/email/to_student_subscription_activated.php",
    "source": "tutor-pro/templates/email/to_student_subscription_activated.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_subscription_cancelled",
    "path": "tutor-pro/templates/email/to_student_subscription_cancelled.php",
    "source": "tutor-pro/templates/email/to_student_subscription_cancelled.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_subscription_expired",
    "path": "tutor-pro/templates/email/to_student_subscription_expired.php",
    "source": "tutor-pro/templates/email/to_student_subscription_expired.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_subscription_hold",
    "path": "tutor-pro/templates/email/to_student_subscription_hold.php",
    "source": "tutor-pro/templates/email/to_student_subscription_hold.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_subscription_renewed",
    "path": "tutor-pro/templates/email/to_student_subscription_renewed.php",
    "source": "tutor-pro/templates/email/to_student_subscription_renewed.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_subscription_trial_activated",
    "path": "tutor-pro/templates/email/to_student_subscription_trial_activated.php",
    "source": "tutor-pro/templates/email/to_student_subscription_trial_activated.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_student_welcome",
    "path": "tutor-pro/templates/email/to_student_welcome.php",
    "source": "tutor-pro/templates/email/to_student_welcome.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_user_email_verification",
    "path": "tutor-pro/templates/email/to_user_email_verification.php",
    "source": "tutor-pro/templates/email/to_user_email_verification.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_user_gifted_a_course",
    "path": "tutor-pro/templates/email/to_user_gifted_a_course.php",
    "source": "tutor-pro/templates/email/to_user_gifted_a_course.php",
    "confidence": "confirmed"
  },
  {
    "name": "to_user_received_a_gifted_course",
    "path": "tutor-pro/templates/email/to_user_received_a_gifted_course.php",
    "source": "tutor-pro/templates/email/to_user_received_a_gifted_course.php",
    "confidence": "confirmed"
  }
]
export const tutorShortcodes: TutorShortcode[] = [
  {
    "name": "tutor_student_registration_form",
    "source": "tutor/classes/Shortcode.php",
    "confidence": "confirmed"
  },
  {
    "name": "tutor_dashboard",
    "source": "tutor/classes/Shortcode.php",
    "confidence": "confirmed"
  },
  {
    "name": "tutor_instructor_registration_form",
    "source": "tutor/classes/Shortcode.php",
    "confidence": "confirmed"
  },
  {
    "name": "tutor_course",
    "source": "tutor/classes/Shortcode.php",
    "confidence": "confirmed"
  },
  {
    "name": "tutor_instructor_list",
    "source": "tutor/classes/Shortcode.php",
    "confidence": "confirmed"
  },
  {
    "name": "tutor_cart",
    "source": "tutor/classes/Shortcode.php",
    "confidence": "confirmed"
  },
  {
    "name": "tutor_checkout",
    "source": "tutor/classes/Shortcode.php",
    "confidence": "confirmed"
  },
  {
    "name": "tutor_login",
    "source": "tutor-pro/classes/Shortcode.php",
    "confidence": "confirmed"
  },
  {
    "name": "tutor_gc_classes",
    "source": "tutor-pro/addons/google-classroom/classes/Init.php",
    "confidence": "confirmed"
  }
]
