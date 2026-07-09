// Auto-generated from Adobe_Descriptions_Copy.xlsx
// DATA + AUTOMATION rows extracted as-is. TEMPLATE rebuilt as structured fields (see TEMPLATE_FIELDS)
// so fields can be added/removed and later auto-filled from a data source (TBD by Akhil).
const APP_DATA = {
  "DATA": [
    {
      "id": 1,
      "checkpoint": "1.1.1.a/1.1.1.b - Text alternative does not include essential text in image",
      "expected_results": "The screen reader focus goes to the above mentioned image and the screen reader announces the text alternative for the image correctly and include all the essential text.\nExpected screen reader announcement:",
      "actual_results": "The screen reader focus goes to the above mentioned image and the screen reader announces the text alternative for the image but does not include all the essential text present in the image.\nCurrent screen reader announcement:"
    },
    {
      "id": 2,
      "checkpoint": "1.1.1.a/1.1.1.b - Text alternative is missing",
      "expected_results": "The screen reader focus goes to the above mentioned image and the screen reader announces the appropriate text alternative for the image.",
      "actual_results": "The screen reader focus does not go the above mentioned image."
    },
    {
      "id": 3,
      "checkpoint": "1.1.1c - Detailed alternative description is missing",
      "expected_results": "The screen reader focus goes the track details graph, it should announce a detailed alternative description of the graph, or provide the complete graph information in a table format that is accessible to screen reader users.",
      "actual_results": "The screen reader focus goes the track details graph the screen reader does not announces anything about the graph."
    },
    {
      "id": 4,
      "checkpoint": "1.1.1.d - Decorative image",
      "expected_results": "The screen reader must ignore the above-specified images as they are decorative images, the images must have an empty text alternative so that it is hidden from the screen reader.",
      "actual_results": "The screen reader focus goes to the above mentioned images and announces as follows------------, but they do not convey any useful information."
    },
    {
      "id": 5,
      "checkpoint": "1.2.1.b - No text or audio description available for video-only content",
      "expected_results": "Text transcript and audio description is provided for the video.",
      "actual_results": "Text transcript and audio description is needed for the video and is the same is not provided for the video."
    },
    {
      "id": 6,
      "checkpoint": "1.3.1.a - Information or relationship only presented visually",
      "expected_results": "The screen reader must convey the unread message information when the screen reader focus goes to the above-mentioned content.\n\nExpected screen reader announcement: Unread message Freelancer The \"Money\" payment request was updated to completed - 100 percent paid, 17/09/25 \nor similar.",
      "actual_results": "The screen reader does not convey the unread information when the screen reader focus goes to the above-mentioned content.\n\nCurrent screen reader announcement: Freelancer The \"Money\" payment request was updated to completed - 100 percent paid, 17/09/25 \n"
    },
    {
      "id": 7,
      "checkpoint": "1.3.1.a - Group of navigation links missing semantics",
      "expected_results": "The screen reader announces the grouping of the above links semantically as navigation links or list, etc.",
      "actual_results": "The above-mentioned links are currently announced as individual links by the screen reader. Their grouping is not conveyed semantically."
    },
    {
      "id": 8,
      "checkpoint": "1.3.1.a - Quotation is missing semantics",
      "expected_results": "The above-specified paragraph is in blockquotes visually. The same information must be conveyed to the screen reader users.",
      "actual_results": "While navigating with the screen reader in the arrow key navigation, the screen reader announces as follows----------"
    },
    {
      "id": 9,
      "checkpoint": "1.3.1.b - Content should be in a data table but is not",
      "expected_results": "The screen reader announces appropriate table markup for the above mentioned element.",
      "actual_results": "The screen reader does not announce the table markup for the above mentioned elements."
    },
    {
      "id": 10,
      "checkpoint": "1.3.1.b - Data table has missing or incomplete header cell markup",
      "expected_results": "The screen reader announces the table header for the above-mentioned controls.",
      "actual_results": "The screen reader does not announce proper table header for the above mentioned table."
    },
    {
      "id": 11,
      "checkpoint": "1.3.1.b - Data cell is marked as a header cell",
      "expected_results": "The 'Select all' checkbox should not be marked as a column header, as it does not function as one.",
      "actual_results": "While navigating the table using Ctrl + Alt + arrow keys (right/left/up/down), when the screen reader focus moves to each row\u2019s checkbox, the screen reader announces the 'Select all' checkbox as a column header."
    },
    {
      "id": 12,
      "checkpoint": "1.3.1.b - Complex table is missing headers-id association",
      "expected_results": "An appropriate header and data cell relation is essential for screen reader users to understand the relation between the content",
      "actual_results": "The header and data cell relation is missing for the above-mentioned table content; as a result, screen reader users are unable to understand the relation between the content."
    },
    {
      "id": 13,
      "checkpoint": "1.3.1.d - group label",
      "expected_results": "When the screen reader focus goes to the above mentioned form controls screen reader must announce the group label.",
      "actual_results": "When the screen reader focus goes to the above mentioned form controls screen reader does not announce the group label."
    },
    {
      "id": 14,
      "checkpoint": "1.3.1.d - Group of radio buttons not associated with group label",
      "expected_results": "When the screen reader focus moves to the radio buttons, it must announce the radio button group. For example, when focus reaches the first radio button, the screen reader should announce: 'Selected Demo Group.",
      "actual_results": "While tabbing through the above specified section using the Tab key, When the screen reader focus goes the above-mentioned radio buttons, the screen reader announces as following \n- First radio button checked 1 of 2"
    },
    {
      "id": 15,
      "checkpoint": "1.3.1.e - Visual heading text is not marked as heading",
      "expected_results": "The screen reader announces the heading level 3 for the above-mentioned elements.",
      "actual_results": "The screen reader does not announce the heading for the above-mentioned elements."
    },
    {
      "id": 16,
      "checkpoint": "1.3.1.e - Text should not be marked as a heading",
      "expected_results": "The screen reader does not announce the heading for the above mentioned element.",
      "actual_results": "The screen reader announces the heading level 2 for the above mentioned elements."
    },
    {
      "id": 17,
      "checkpoint": "1.3.1.e - Heading levels out of order",
      "expected_results": "Screen reader announces the headings with appropriate heading levels so that the structure of the content is properly conveyed.\n\nSuggested Heading levels:",
      "actual_results": "The headings are marked up with incorrect heading levels so the structure of the content is not properly conveyed to the screen reader users. \n\nCurrent heading levels:"
    },
    {
      "id": 18,
      "checkpoint": "1.3.1.f - Visual list",
      "expected_results": "The screen reader announces the list for the above-mentioned elements.",
      "actual_results": "The screen reader does not announce the list for the above-mentioned elements."
    },
    {
      "id": 19,
      "checkpoint": "1.3.1.f - List or list item not marked up properly",
      "expected_results": "The entire list is enclosed in single <ul> and is announced as a list with 4 items when user navigates to it.",
      "actual_results": "The above list items are broken into/marked up as separate lists."
    },
    {
      "id": 20,
      "checkpoint": "1.3.1.f - Content is not a list but marked up as such",
      "expected_results": "The screen reader does not announce list markup for the above-mentioned element.",
      "actual_results": "The screen reader announces the list mark for the above-mentioned elements."
    },
    {
      "id": 21,
      "checkpoint": "1.3.2 - aria-hidden=true",
      "expected_results": "The \"aria-hidden=true\" is removed for the above-mentioned links, and the screen reader announces the link role.",
      "actual_results": "The \"aria-hidden=true\" is provided for the above-mentioned links, due to which the screen reader does not announce the link role."
    },
    {
      "id": 22,
      "checkpoint": "1.3.2 - Hidden content is readable with a screen reader",
      "expected_results": "The screen reader does not announce the above mentioned hidden content during the arrow key navigation",
      "actual_results": "The screen reader announces the above mentioned hidden content during the arrow key navigation."
    },
    {
      "id": 23,
      "checkpoint": "1.3.2 - Informative (static) content is not readable by a screen reader",
      "expected_results": "The screen reader announces the above mentioned static text during the arrow key navigation.",
      "actual_results": "The screen reader does not announces the above mentioned static text during the arrow key navigation."
    },
    {
      "id": 24,
      "checkpoint": "1.3.2 - Static text displayed and screen reader announcement do not match",
      "expected_results": "The screen reader announces exact static text that is present on the screen during the swipe navigation. \n\nExpected screen reader: Sat, 13 Sep at 3:35 AM",
      "actual_results": "The screen reader does not announces exact static text that is present on the screen during the swipe navigation. \n\nCurrent screen reader announcement: 1 Month"
    },
    {
      "id": 25,
      "checkpoint": "1.3.2 - Able to browse outside modal with screen reader",
      "expected_results": "The screen reader focus is maintained in the opened modal and does not go out of the modal during the arrow key navigation.",
      "actual_results": "The screen reader focus is not maintained in the opened modal; instead, the screen reader focus goes to the parent page content during the arrow key navigation."
    },
    {
      "id": 26,
      "checkpoint": "1.3.4 - Does not rotate to new orientation",
      "expected_results": "The app rotates to the new orientation and is displayed in the landscape view. The orientation of the content is not locked to either landscape or portrait mode unless a specific orientation is essential for the functionality. \n\nNOTE: The W3C working group that maintains the WCAG guidelines has debated the question about whether or not Success Criterion 1.3.4 Orientation applies to native mobile applications and has not come to a conclusion. They have deferred an opinion to the WCAG2ICT Task Force. Therefore, we raise this issue to allow you to weigh the risk of not allowing for orientation changes or planning for it now if / when a determination is made that it is applicable. Deque\u2019s strong recommendation is that Success Criterion 1.3.4 Orientation be taken into account on both phone and tablet devices \u2013 most certainly on tablets.",
      "actual_results": "The app remains in portrait view and does not change to landscape view."
    },
    {
      "id": 27,
      "checkpoint": "1.4.1.a - Color alone is used to identify error(s)",
      "expected_results": "The above mentioned form fields convey the error beyond just color.",
      "actual_results": "The above mentioned form fields convey the error through only color."
    },
    {
      "id": 28,
      "checkpoint": "1.4.1.a - Color alone (Graph)",
      "expected_results": "The track graph should include an alternative method of differentiation beyond just color.",
      "actual_results": "The track graph information is conveyed through only color."
    },
    {
      "id": 29,
      "checkpoint": "1.4.1.a - Focus indicator",
      "expected_results": "When the keyboard focus goes to the above-specified control, the focus state should be conveyed using an additional visual indicator beyond just color, or the contrast ratio between the default and focused states should meet the minimum 3:1 requirement.",
      "actual_results": "When the keyboard focus goes to the above-specified control, the focus state is indicated by a change in the color; however, the contrast ratio between the default and focused states does not meet the minimum requirement of 3:1.\n\nContrast Details"
    },
    {
      "id": 30,
      "checkpoint": "1.4.1.a - selected state",
      "expected_results": "The selected state should be conveyed using an additional visual indicator beyond just color, or the contrast ratio between the selected and default states should meet the minimum 3:1 requirement.",
      "actual_results": "A change in color indicates the selected state; however, the contrast ratio between the selected and default states does not meet the minimum requirement of 3:1\n\nContrast Details\nSelected state color: #248CDF\nDefault Element color: #817F7F\nContrast Ratio: 1.11: 1"
    },
    {
      "id": 31,
      "checkpoint": "1.4.1.b - Link with surrounding text",
      "expected_results": "The above mentioned link should be conveyed using an additional visual indicator beyond just color to differentiate itself from the surrounding text, or at least have a 3:1 contrast between the link text and the surrounding text color.",
      "actual_results": "Color alone is used to differentiate link text from the surrounding text. The contrast between the link text color and the surrounding text color is not at least 3:1."
    },
    {
      "id": 32,
      "checkpoint": "1.4.3.a - Text content lacks 4.5:1 color contrast",
      "expected_results": "The above mentioned text has a sufficient 4.5:1 color contrast with its background.",
      "actual_results": "The above mentioned text lacks 4.5:1 color contrast with its background.\n\nContrast Details"
    },
    {
      "id": 33,
      "checkpoint": "1.4.3.a - Placeholder text lacks 4.5:1 color contrast",
      "expected_results": "The above mentioned placeholder text has 4.5:1 color contrast with its background",
      "actual_results": "The above mentioned placeholder text lacks 4.5:1 color contrast with its background.\n\nContrast Details"
    },
    {
      "id": 34,
      "checkpoint": "1.4.3.a - Text on focus",
      "expected_results": "When the keyboard focus goes to the specified controls, the control text color with its background color must have a 4.5:1 contrast ratio.",
      "actual_results": "While tabbing in the Export Multitrack Modal using the Tab key, when the keyboard focus goes to the specified controls, the control text color with it's background color does not have a 4.5:1 contrast ratio.\n\nContrast Details\nControl text color: #FFFFFF\nBackground color: #2D8CEB\nContrast Ratio: 3.46: 1"
    },
    {
      "id": 35,
      "checkpoint": "1.4.3.a - Text on hover",
      "expected_results": "The above mentioned text has a 4.5:1 color contrast with its background on hover.",
      "actual_results": "The above mentioned text lacks 4.5:1 color contrast with its background on hover.\n\nContrast Details"
    },
    {
      "id": 36,
      "checkpoint": "1.4.3.a - Text on focus and on hover",
      "expected_results": "The above mentioned text has a 4.5:1 color contrast with its background on mouse hover and on keyboard focus.",
      "actual_results": "The above mentioned text lacks a 4.5:1 color contrast with its background on mouse hover and on keyboard focus."
    },
    {
      "id": 37,
      "checkpoint": "1.4.4 - Resize",
      "expected_results": "When the page is zoomed to 200%, the above-specified control must be available.",
      "actual_results": "When the page is zoomed to 200%, the above-specified control is unavailable."
    },
    {
      "id": 38,
      "checkpoint": "1.4.5 - Image of text is used instead of real text",
      "expected_results": "Real text should be used, and CSS should be utilized to achieve the required styling.",
      "actual_results": "The image contains embedded text. An image of text is used instead of normal text on the page for the above-mentioned text."
    },
    {
      "id": 39,
      "checkpoint": "1.4.10 - Reflow",
      "expected_results": "When the page is adjusted to an equivalent width of 320px, the above-mentioned control must be available.",
      "actual_results": "When the page is adjusted to an equivalent width of 320px, the above-mentioned control is unavailable."
    },
    {
      "id": 40,
      "checkpoint": "1.4.11.a - Active user interface component lacks 3 to 1 contrast ratio",
      "expected_results": "The above mentioned form fields visual boundary have a minimum 3:1 color contrast ratio with its adjacent background.",
      "actual_results": "The above mentioned form fields visual boundary lacks a 3:1 color contrast with its adjacent background.\n\nContrast Details"
    },
    {
      "id": 41,
      "checkpoint": "1.4.11.a - Slider lacks 3:1",
      "expected_results": "The above-mentioned slider visual boundary must have a minimum 3:1 color contrast ratio with its adjacent background.",
      "actual_results": "The above-mentioned slider visual boundary lacks a 3:1 color contrast with its adjacent background.\n\nContrast Details\nVisual boundary color: #454545\nOuter adjacent color: #232323\nContrast Ratio: 1.63: 1"
    },
    {
      "id": 42,
      "checkpoint": "1.4.11.b - State of active component lacks 3 to 1 contrast ratio",
      "expected_results": "The above-mentioned control's selected state color needs to be greater than or equal to 3:1 to its adjacent color.",
      "actual_results": "The above-mentioned control's selected state color is less than 3:1 to its adjacent color.\n\nContrast Details"
    },
    {
      "id": 43,
      "checkpoint": "1.4.11.b - Focus indicator lacks 3 to 1 contrast ratio",
      "expected_results": "When the keyboard focus goes to the above mentioned element the focus indicator has a minimum of 3:1 color contrast with its background.",
      "actual_results": "When the keyboard focus goes to the above mentioned element the focus indicator lacks 3:1 color contrast with its background."
    },
    {
      "id": 44,
      "checkpoint": "1.4.11.c - An icon lacks 3 to 1 contrast ratio",
      "expected_results": "The above-mentioned icons must have a minimum 3:1 color contrast with their background.",
      "actual_results": "The above-mentioned icons lacks a 3:1 contrast ratio with their background."
    },
    {
      "id": 45,
      "checkpoint": "1.4.12 - Text spacing content cut off",
      "expected_results": "When text spacing is adjusted, the specified text must not be cut off. The entire content must be clearly visible.",
      "actual_results": "When text spacing is adjusted, the specified text is cut off and not visible clearly."
    },
    {
      "id": 46,
      "checkpoint": "1.4.12 - Text spacing content overlaps",
      "expected_results": "When text spacing is adjusted the specified text must not be overlap with other content. The entire content must be clearly visible.",
      "actual_results": "When text spacing is adjusted, the specified text overlaps with other content and not visible clearly"
    },
    {
      "id": 47,
      "checkpoint": "1.4.13 - Additional content not dismissible",
      "expected_results": "The above-mentioned tooltip is dismissible with the keyboard without moving the mouse hover or keyboard focus. \n\nNote: In case of tooltips within the modal, when the user presses the Escape key to dismiss the tooltip content that appears on hover over the specified controls, the tooltip should be dismissed on the first press of the Escape key. If the user presses the Escape key a second time, it should then dismiss the modal.",
      "actual_results": "The above-mentioned tooltip is not dismissible without moving the mouse hover or keyboard focus."
    },
    {
      "id": 48,
      "checkpoint": "1.4.13 - Hover content disappearing",
      "expected_results": "The tooltip content must allow the user to move the mouse pointer over the tooltip content without disappearing.",
      "actual_results": "The tooltip content that appears on hover of the specified controls, the same tooltip content does not allow the user to move the mouse pointer over without the tooltip content disappearing."
    },
    {
      "id": 49,
      "checkpoint": "2.1.1 - For drop and dropdown options",
      "expected_results": "The above-specified dropdown control and options must be fully accessible to keyboard users. Users should be able to navigate to the dropdown using the keyboard, expand it, and move through the available options using standard keyboard interactions.",
      "actual_results": "The above-specified dropdown control displays options when clicked with a mouse on the dropdown icon, but these options are not accessible to keyboard users."
    },
    {
      "id": 50,
      "checkpoint": "2.1.1 - Function cannot be performed by keyboard alone",
      "expected_results": "The above-specified controls must be fully accessible to keyboard users. Users should be able to navigate to the controls using standard keyboard interactions.",
      "actual_results": "When the user navigates using the tab key, the keyboard focus does not go to the above-mentioned controls."
    },
    {
      "id": 51,
      "checkpoint": "2.1.1 - Action cannot be performed with a screen reader turned on",
      "expected_results": "The screen reader user is able to activate the checkbox using the enter/space key, and the checkbox gets checked.",
      "actual_results": "When the screen reader user activates the checkbox using the enter/space key, the action is not performed."
    },
    {
      "id": 52,
      "checkpoint": "2.1.1 - Method to dismiss modal without submitting data is not available",
      "expected_results": "The keyboard user must have a way to dismiss the dialog without selecting an option from the expanded dialog using the Esc key.",
      "actual_results": "The keyboard user is not able to dismiss the dialog without selecting an option from the expanded dialog"
    },
    {
      "id": 53,
      "checkpoint": "2.1.2 - Keyboard trap",
      "expected_results": "A keyboard trap is not present when the above-mentioned element receives focus, and keyboard-only users are able to move away from the element using the tab or shift tab keys.",
      "actual_results": "A keyboard trap is present when the above-mentioned element receives focus. Keyboard-only users are not able to move away from the element using tab or shift tab keys."
    },
    {
      "id": 54,
      "checkpoint": "2.2.1 - Content visually appears and disappears with no ability to adjust timing",
      "expected_results": "The above mentioned status message must be displayed on the screen until the user dismisses it.",
      "actual_results": "The above mentioned status message appears on the screen, but does not stay until the user closes it, preventing users from pursuing the information."
    },
    {
      "id": 55,
      "checkpoint": "2.2.2.a - Auto-playing media or animation has no mechanism to pause, stop, or hide",
      "expected_results": "A mechanism must be provided that allows users to pause, stop, or hide the background color-changing animation.",
      "actual_results": "The '---------' screen has a background color changing animation, and users don\u2019t have any option to pause, stop, or hide it."
    },
    {
      "id": 56,
      "checkpoint": "2.4.2 - Page TITLE element does not identify purpose of page",
      "expected_results": "The screen reader announces the page title as ------------------",
      "actual_results": "The screen reader announces the page title as -------------------- which does not identify the purpose of the page."
    },
    {
      "id": 57,
      "checkpoint": "2.4.3 - Keyboard focus is not placed on opened modal",
      "expected_results": "When the user trigger the \"-----------\" button, the keyboard focus should placed on the modal.",
      "actual_results": "When the user trigger the \"-----------\" button, the modal dialog open and the keyboard focus remains on the trigger button. \n"
    },
    {
      "id": 58,
      "checkpoint": "2.4.3 - Keyboard focus is not maintained in modal",
      "expected_results": "While tabbing through the \"----------\" dialog the keyboard focus must be trapped within the dialog.",
      "actual_results": "While tabbing through the \"----------------\" dialog the keyboard focus goes to the dialog background controls"
    },
    {
      "id": 59,
      "checkpoint": "2.4.3 - Modal is closed, focus is not returned to trigger",
      "expected_results": "When the \"-----------\" dialog is closed, the keyboard focus must be placed on the modal dialog trigger \"----------\" button.",
      "actual_results": "When the \"----------------\" dialog is closed, the keyboard focus is not placed on the modal dialog trigger \"----------\" button."
    },
    {
      "id": 60,
      "checkpoint": "2.4.3 - Hidden or empty element receives focus",
      "expected_results": "The keyboard focus does not fall on the hidden elements.",
      "actual_results": "While tabbing to the above-specified controls, the keyboard focus falls on the visually hidden elements."
    },
    {
      "id": 61,
      "checkpoint": "2.4.3 - Keyboard focus does not move to intended target",
      "expected_results": "When the user activates the specified alert banner trigger buttons, the keyboard focus should immediately placed on the alert banner.",
      "actual_results": "When the user activates the specified alert banner trigger buttons, the alert banner appears on the screen, but the keyboard focus is not immediately placed on it, the user must tab through all interactive controls in the main section to reach the alert banner."
    },
    {
      "id": 62,
      "checkpoint": "2.4.3 - Keyboard focus is lost or misplaced due to user interaction or content update",
      "expected_results": "When the user expands/collapses the above specified accordion controls, the keyboard focus should be present on the trigger accordion control.",
      "actual_results": "When the user expands/collapses the above specified accordion controls, the keyboard focus is lost and keyboard focus does not appears"
    },
    {
      "id": 63,
      "checkpoint": "2.4.3 - Keyboard focus order is not logical",
      "expected_results": "",
      "actual_results": ""
    },
    {
      "id": 64,
      "checkpoint": "2.4.3 - Use of positive tabindex value is not logical",
      "expected_results": "",
      "actual_results": ""
    },
    {
      "id": 65,
      "checkpoint": "2.4.4 - Purpose of link",
      "expected_results": "The screen reader should announce a descriptive and unique link text for the control. \n\nSuggested link text - ------------",
      "actual_results": "When the screen reader focuses goes to the above mentioned link, the name of the link is announced as the --------------"
    },
    {
      "id": 66,
      "checkpoint": "2.4.4 - Multiple links",
      "expected_results": "The screen reader must announce unique descriptive names for the above-mentioned links",
      "actual_results": "When the screen reader focus goes to the above-mentioned elements screen reader announces the same name for the links.\n\nScreen reader announces as follows:"
    },
    {
      "id": 67,
      "checkpoint": "2.4.6 - Controls have same name but different actions",
      "expected_results": "The screen reader must announce unique descriptive names for the above-mentioned controls",
      "actual_results": "When the screen reader focus goes to the above-mentioned elements screen reader announces the same name for the elements.\n\nScreen reader announcement:---"
    },
    {
      "id": 68,
      "checkpoint": "2.4.6 - Programmatic label does not convey purpose of control",
      "expected_results": "The screen reader announces the descriptive programmatic label for the above mentioned controls\n\nSuggested Programmatic label:--------",
      "actual_results": "The screen reader does not announce the descriptive programmatic label for the above mentioned controls\n\nCurrent Programmatic label: ---------"
    },
    {
      "id": 69,
      "checkpoint": "2.4.7 - Focus indicator missing",
      "expected_results": "When the keyboard focus goes to the above-specified control, a visual focus indicator appears.",
      "actual_results": "When the keyboard focus goes to the above-specified control, a visual focus indicator is missing."
    },
    {
      "id": 70,
      "checkpoint": "2.4.7 - Focus indicator is not visible",
      "expected_results": "When the keyboard focus goes to the above-specified control, a visual focus indicator appears and is clearly visible.",
      "actual_results": "The focus indicator for the above element is not visible clearly as the default focus indicator and background lack a 3:1 color contrast ratio."
    },
    {
      "id": 71,
      "checkpoint": "2.4.11 - Focus not obsurced",
      "expected_results": "The keyboard focus is not obscured during keyboard navigation. Ensure that the focused element is visible when the element receives focus.",
      "actual_results": "The keyboard focus is obscured, and the element is not visible during keyboard navigation."
    },
    {
      "id": 72,
      "checkpoint": "2.5.1 - Path-based gesture required",
      "expected_results": "The specified links can be navigated without requiring the use of a path-based gesture.",
      "actual_results": "The specified links are arranged vertically; however, navigating to the next link requires the user to swipe right, which involves a path-based gesture"
    },
    {
      "id": 73,
      "checkpoint": "2.5.3 - Accessible name missing",
      "expected_results": "Visible label should be programmatically associated with the edit field. The screen reader must announce the edit fields accessible name.\n\nExpected screen reader announcement:",
      "actual_results": "The visible label is not associated programmatically with the edit field. The screen reader does not annoounce the accessible name for the edit field.\n\nCurrent Accessible name:"
    },
    {
      "id": 74,
      "checkpoint": "2.5.3 - Accessible name has interspersed words",
      "expected_results": "The screen reader announces the accessible name for the above mentioned controls without interspersed words\n\nExpected screen reader announcement:-----",
      "actual_results": "The screen reader announces the accessible name for the above mentioned controls but has some interspersed words\n\nCurrent screen reader announcement:-------"
    },
    {
      "id": 75,
      "checkpoint": "2.5.3 - Accessible name does not contain visible label",
      "expected_results": "When the screen reader focus goes to the above mentioned controls the screen reader includes the visible label in the screen reader announcement.\n\nExpected screen reader announcement:-------",
      "actual_results": "When the screen reader focus goes to the above mentioned controls the screen reader announcement does not include the visible label.\n\nCurrent screen reader announcement-----"
    },
    {
      "id": 76,
      "checkpoint": "2.5.7 - Dragging movements",
      "expected_results": "There is an alternative method to accomplish the same function that can be accomplished using single-pointer e.g. up/down/left/right buttons.",
      "actual_results": "Drag and drop functionality is used to resize the column headers and there is no alternative method to accomplish the same function that can be accomplished using single-pointer."
    },
    {
      "id": 77,
      "checkpoint": "2.5.8 - Target Size",
      "expected_results": "The target size of the mentioned elements has a sufficient target size of 24 X 24 CSS px.",
      "actual_results": "The target size of the mentioned elements does not have a target size of at least 24 X 24 CSS px. \nCurrent target size: 22 X 23"
    },
    {
      "id": 78,
      "checkpoint": "3.1.2 - Change in language is not marked",
      "expected_results": "The change in language for the above mentioned elements is marked.",
      "actual_results": "The change in language for the above mentioned elements is not marked."
    },
    {
      "id": 79,
      "checkpoint": "3.3.1 - Form field with error not identified",
      "expected_results": "The specified error message must either include the field name (----------) or be directly associated with the field",
      "actual_results": "The specified error message does not include the field name (-------------), nor is it properly associated with the field"
    },
    {
      "id": 80,
      "checkpoint": "3.3.1.b - Input error is not described in text",
      "expected_results": "Input error for \"Invalid\" checkboxes should be clearly defined in text.",
      "actual_results": "No text-defined input error is present for \"Invalid\" checkboxes."
    },
    {
      "id": 81,
      "checkpoint": "3.3.2.a - Visible label missing",
      "expected_results": "The control must have a visible label to make its purpose clear and associate the visible label for the edit field.",
      "actual_results": "The above control does not have a visible label, and the purpose of the form field is not clear without a visible label."
    },
    {
      "id": 82,
      "checkpoint": "3.3.2.a - Label is persistent",
      "expected_results": "The above-specified form fields must have a persistent visual label that should always be available.",
      "actual_results": "When the user enters any value in the form field, the placeholder disappears, and the user has no other way to identify the field's purpose"
    },
    {
      "id": 83,
      "checkpoint": "3.3.2 - Select or dropdown control missing a visible label",
      "expected_results": "The above mentioned select drop down must have a visible label to make its purpose clear and associate the visible label for the select drop down.",
      "actual_results": "The above mentioned select drop down does not have visible label and the purpose of the drop down is not clear without a visible label."
    },
    {
      "id": 84,
      "checkpoint": "3.3.2 - Visible group label missing",
      "expected_results": "The visible group label should available for the Hours and Minutes spin button.",
      "actual_results": "The visible group label is missing for the Hours and Minutes spin button."
    },
    {
      "id": 85,
      "checkpoint": "3.3.2 - Instructions are inaccurate or incomplete for assistive technology users",
      "expected_results": "The provided instructions are not functional for the sliders. Either remove the instructions (\u2018Press Escape or double click to reset the slider to its default value\u2019) or implement the functionality as described",
      "actual_results": "While navigating with the Tab key, when the screen reader focus moves to the sliders, it announces the following instruction for all the sliders \n- 50 slider Press escape or double click to reset the slider to its default value. \n"
    },
    {
      "id": 86,
      "checkpoint": "4.1.2.a - Form field missing accessible name",
      "expected_results": "When the screen reader focus goes to the above-mentioned form controls, the screen reader must announce the edit fields' accessible name.\n\nExample of screen announcement\nSession File Name edit selected Untitled Session 2 mixdown.wav",
      "actual_results": "When the screen reader focus goes to the above-mentioned form controls, the screen reader announces as follows\n- Edit selected Untitled Session 2 mixdown.wav\n- Edit selected C:\\Users\\DQ_Bharawaj\\Documents"
    },
    {
      "id": 87,
      "checkpoint": "4.1.2.a - Button missing role",
      "expected_results": "The screen reader announces the button role for the above mentioned elements",
      "actual_results": "The screen reader does not announce the button role for the above mentioned controls."
    },
    {
      "id": 88,
      "checkpoint": "4.1.2.a - Button: Button does not have a name",
      "expected_results": "The screen reader announces the descriptive button name for the above mentioned button.\n\nExpected screen reader announcement:------",
      "actual_results": "The screen reader does not announce the descriptive button name for the above mentioned button.\n\nCurrent Screen reader announcement:"
    },
    {
      "id": 89,
      "checkpoint": "4.1.2.a - control missing both role and name",
      "expected_results": "When the screen reader focus goes to the above-mentioned controls, the screen reader must announce the control's accessible name and button role.",
      "actual_results": "When the screen reader focus goes to the above-mentioned controls, the screen reader does not announce the controls' accessible name and role."
    },
    {
      "id": 90,
      "checkpoint": "4.1.2.a - Link role missing",
      "expected_results": "When the screen reader focus goes to the above-mentioned control, the screen reader must announce the link role.",
      "actual_results": "When the screen reader focus goes to the above-mentioned control, the screen reader does not announce the link role."
    },
    {
      "id": 91,
      "checkpoint": "4.1.2.a - Link missing discrinble text",
      "expected_results": "When the screen reader focus goes to the above-mentioned control, the screen reader must announce the controls accessible name.",
      "actual_results": "When the screen reader focus goes to the above-mentioned control, the screen reader does not announce the controls accessible name."
    },
    {
      "id": 92,
      "checkpoint": "4.1.2.a - Slider missing both role and name",
      "expected_results": "When the screen reader focus goes to the above-mentioned control, the screen reader must announce the control's accessible name and slider role.",
      "actual_results": "When the screen reader focus goes to the above-mentioned control, the screen reader does not announce the controls' accessible name and role."
    },
    {
      "id": 93,
      "checkpoint": "4.1.2.a - Selected state",
      "expected_results": "When the screen reader focus goes to the above-mentioned selected controls, the screen reader must announce the control's selected state.",
      "actual_results": "When the screen reader focus goes to the above-mentioned selected controls, the screen reader does not announce the selected state."
    },
    {
      "id": 94,
      "checkpoint": "4.1.2.a - Pressed state",
      "expected_results": "When the screen reader focus goes to the above mentioned controls the screen reader must announce the pressed state.",
      "actual_results": "When the screen reader focus goes to the above mentioned control the screen reader does not announce the pressed state."
    },
    {
      "id": 95,
      "checkpoint": "4.1.2.a - Expand/collapse state",
      "expected_results": "The specified button functions as a toggle. When the screen reader focuses on it, it should announce the button\u2019s expand or collapse state. \n",
      "actual_results": "While tabbing when the screen reader focus goes to the above specified toggle button, the screen reader announces as following \n- Overlay Trigger button \n"
    },
    {
      "id": 96,
      "checkpoint": "4.1.2.a - Disabled state",
      "expected_results": "When the screen reader focus goes to the above mentioned button the screen reader must announce the disabled state for the above mentioned controls.",
      "actual_results": "When the screen reader focus goes to the above mentioned controls the screen reader does not announce the disabled state for the above mentioned elements."
    },
    {
      "id": 97,
      "checkpoint": "4.1.2.a - Custom checkbox",
      "expected_results": "When the screen reader focus goes to the above-mentioned checkbox, the screen reader must announce the checkbox's accessible name, role, and state",
      "actual_results": "When the screen reader focus goes to the above-mentioned checkbox, the screen reader does not announce the checkbox's accessible name, role, and state."
    },
    {
      "id": 98,
      "checkpoint": "4.1.2.a - Custom select",
      "expected_results": "When the screen reader focus goes to the above-mentioned dropdown control, the screen reader must announce the dropdown control's accessible name, role, and state.",
      "actual_results": "When the screen reader focus goes to the above-mentioned dropdown control, the screen reader does not announce the dropdown control's accessible name, role, and state."
    },
    {
      "id": 99,
      "checkpoint": "4.1.2.a - Radio button",
      "expected_results": "When the screen reader focus goes to the above-mentioned radio buttons, the screen reader must announce the radio button's accessible name, role, and state",
      "actual_results": "When the screen reader focus goes to the above-mentioned radio button, the screen reader does not announce the radio button's accessible name, role, and state."
    },
    {
      "id": 100,
      "checkpoint": "4.1.2.a - Anchor or button nested inside other anchor or button",
      "expected_results": "The screen reader announces only button role for the above mentioned control and receives only single keyboard focus.",
      "actual_results": "The screen reader announces the button and link role for the above mentioned control and it receives the keyboard focus twice."
    },
    {
      "id": 101,
      "checkpoint": "4.1.2.a - Table sort state is missing",
      "expected_results": "The screen reader announces the ascending or descending sorting for the above-mentioned controls.",
      "actual_results": "The screen reader does not announces the ascending or descending sorting for the above mentioned controls."
    },
    {
      "id": 102,
      "checkpoint": "4.1.2.a - NA",
      "expected_results": "NA",
      "actual_results": "NA"
    },
    {
      "id": 103,
      "checkpoint": "4.1.2.b - States/Properties: The element has incorrect states or properties",
      "expected_results": "The screen reader does not announce the collapsed state for the above-mentioned button. \n\nExpected screen reader announcement:-------",
      "actual_results": "The screen reader announces the incorrect collapsed state for the above-mentioned button. \n\nCurrent Screen reader announcement:-------"
    },
    {
      "id": 104,
      "checkpoint": "4.1.2.b - Role: The element's role is missing or incorrect",
      "expected_results": "The screen reader does not announce the link role for the above-mentioned element.",
      "actual_results": "The screen reader announces the link role for the above-mentioned element."
    },
    {
      "id": 105,
      "checkpoint": "4.1.2.b - Switch: Switch is missing appropriate roles and/or attributes",
      "expected_results": "When the screen reader focus goes to the above mentioned controls, the screen reader must announce as a switch with an appropriate role, a descriptive name, and the necessary states.",
      "actual_results": "The screen reader does not announce the above-mentioned element with a role or a descriptive name."
    },
    {
      "id": 106,
      "checkpoint": "4.1.2.b - Slider: Slider is missing appropriate role and/or attributes",
      "expected_results": "When the screen reader focus goes to the above mentioned controls, the screen reader must announce as a slider with an appropriate roles and attributes.",
      "actual_results": "The screen reader does not announce the above-mentioned element with a role or a descriptive name."
    },
    {
      "id": 107,
      "checkpoint": "4.1.2.b - Tooltip: Tooltip content is not accessible to screen readers",
      "expected_results": "The screen reader announces the above mentioned tooltip content.",
      "actual_results": "The screen reader does not announce the above mentioned tooltip content."
    },
    {
      "id": 108,
      "checkpoint": "4.1.2.b - Carousel: State of current carousel slide is not conveyed",
      "expected_results": "The screen reader must announce current state for the above mentioned carousel.",
      "actual_results": "The screen reader does not announce the current state for the above mentioned carousel"
    },
    {
      "id": 109,
      "checkpoint": "4.1.2.b - Carousel: Number of carousel slides is apparent visually but not programmatically",
      "expected_results": "The screen reader must announce the number slides present for the above mentioned carousel.",
      "actual_results": "The screen reader does not announce the number of slides for the above mentioned carousel."
    },
    {
      "id": 110,
      "checkpoint": "4.1.2.b - Combobox: Combobox is missing appropriate roles and/or attributes",
      "expected_results": "When the screen reader focus goes to the above mentioned control, the screen reader must annouce the appropriate combobox role and attributes",
      "actual_results": "When the screen reader focus goes to the above mentioned control the screen reader does not announce the appropriate role."
    },
    {
      "id": 111,
      "checkpoint": "4.1.2.b - Dialog role",
      "expected_results": "When the screen reader focus goes to the above mentioned dialog, the screen reader must announce the appropriate dialog role and descriptive name.",
      "actual_results": "When the screen reader focus goes to the above mentioned dialog, the screen reader does not announce the dialog role."
    },
    {
      "id": 112,
      "checkpoint": "4.1.2.b - Tab widget",
      "expected_results": "When the screen reader focus goes to the above mentioned controls the screen reader must announces the tab role and appropriate state.",
      "actual_results": "When the screen reader focus goes to the above mentioned controls the screen reader does not announce the tab widget role."
    },
    {
      "id": 113,
      "checkpoint": "4.1.2.b - Role: The element's role is incorrect",
      "expected_results": "Screen reader users may get confused when the alert banner is announced with a 'Dialog' role. Ensure that when focus moves to the alert banner, the screen reader does not announce it as a 'Dialog'.",
      "actual_results": "While tabbing, when the screen reader focus reaches the specified alert banner, it announces the role as 'Dialog'."
    },
    {
      "id": 114,
      "checkpoint": "4.1.2.b - Name: The element's name is missing or incorrect",
      "expected_results": "While navigating through the content using the down arrow keys, the screen reader announces as 'Loading\u2026 progress bar 80%'.",
      "actual_results": "While navigating through the content using the down arrow keys, the screen reader announces as 'clickable progress bar 80%'. The 'Loading\u2026' text is not getting announced to the user."
    },
    {
      "id": 115,
      "checkpoint": "4.1.2.b - States/Properties: The element has missing or incorrect states or properties",
      "expected_results": "The above field must have a read-only state conveyed to the screen reader users.",
      "actual_results": "The above field is missing read-only state."
    },
    {
      "id": 116,
      "checkpoint": "4.1.2.b - (Incorrent disabled state) States/Properties: The element has missing or incorrect states or properties",
      "expected_results": "The screen reader does not announce the disabled state when the focus goes to the above mentioned control.\n\nExpected screen reader announcement: Message request button.",
      "actual_results": "The screen reader announces the disabled state when the focus goes to the above mentioned control. \n\nCurrent screen reader announcement: Message request dimmed button heading."
    },
    {
      "id": 117,
      "checkpoint": "4.1.2.b - Progress bar: Progress bar is missing appropriate role and/or attributes",
      "expected_results": "The progress bar percentage(%) information must be conveyed to the users programmatically.",
      "actual_results": "The progress bar information is conveyed to the users programmatically but the percentage(%) is not announced."
    },
    {
      "id": 118,
      "checkpoint": "4.1.3 - Status message",
      "expected_results": "The screen reader announces the above-mentioned status message as soon as it appears.",
      "actual_results": "The screen reader does not announce anything when the loading indicator appears."
    }
  ],
  "AUTOMATION": [
    {
      "id": 1,
      "automation_title": "[role=\"img\"] elements must have an alternative text",
      "modified_alternative": "Text alternative for the active image missing",
      "expected_results": "Text alternativeis provided the above mentioned active image(s).",
      "actual_results": "Text alternative is missing for the above mentioned active image(s).",
      "recommendation_to_fix": "Fix this issue by using ONE of the following techniques:-\n\n1. Use the alt attribute on the <img> element to convey the destination, purpose, or function of the image.\n\n<a href=\"index.html\"><img src=\"ABCD-logo.png\" alt=\"ABCD Home\"></a>\n\n2. Use the aria-label attribute to convey the destination, purpose, or function of the image.\n\n<button class=\"infoicon\" aria-label=\"more information\"></button>\n\n<a href=\"javascript:alert('Warning!');\" aria-label=\"warning\">\n<svg focusable=\"false\">\n<use xlink:href=\"#warning\"></use>\n</svg>\n</a>\n\nResource Link: \nDeque University: https://dequeuniversity.com/class/images/alt-text/actionable-links-buttons\nW3C-WAI tutorial: https://www.w3.org/WAI/tutorials/images/"
    },
    {
      "id": 2,
      "automation_title": "Images must have alternative text",
      "modified_alternative": "Text alternative for the informative image is missing",
      "expected_results": "Text alternative is provided for the above mentioned informative image(s).",
      "actual_results": "Text alternative is missing for the above mentioned informative image(s).",
      "recommendation_to_fix": "Fix this issue by using ONE of the following techniques:- \n\n1. Use the alt attribute on the <img> element to convey the intent, purpose, or meaning of the image. \n\n<img src=\"sunset.jpg\" alt=\"The sun setting over the Pacific Ocean, with a silhouette of a flying seagull in the foreground\"> \n\n<img src=\"cat.svg\" alt=\"cat\" role=\"img\"> (role is optional, for backwards compatibility with Safari) \n\n2. Use aria-label and role=\"img\" to convey the intent, purpose, or meaning of the image. \n\n<p>Have a great day <span class=\"fonticon smiley\" role=\"img\" aria-label=\"Smiley face\"></span></p> \n\n<svg role=\"img\" aria-label=\"cat\"> \n\n3. Use CSS clipped text to provide screen reader accessible (non-visible) alternative text. \n\n<a href=\"https://www.facebook.com/dequesystems\" class=\"fb\"> \n<span class=\"sr-text\">Deque's Facebook page</span> \n</a> \n\n.sr-text { \nposition: absolute; \nclip: rect(1px, 1px, 1px, 1px); \n-webkit-clip-path: inset(50%) ; \nclip-path: inset(50%); \npadding: 0; \nborder: 0; \nheight: 1px; \nwidth: 1px; \nwhite-space: nowrap; \noverflow: hidden; \n} \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/images/alt-text/informative \nW3C-WAI tutorial: https://www.w3.org/WAI/tutorials/images/"
    },
    {
      "id": 3,
      "automation_title": "Certain ARIA roles must contain particular children",
      "modified_alternative": "ARIA roles does not contain required children roles",
      "expected_results": "The above-mentioned element(s) with [PLACEHOLDER – ADD THE CURRENT PARENT ROLE] is provided with the required [PLACEHOLDER – ADD THE MISSING CHILD ROLE].",
      "actual_results": "The above-mentioned element(s) with [PLACEHOLDER – ADD THE CURRENT PARENT ROLE] is missing the required [PLACEHOLDER – ADD THE MISSING CHILD ROLE].",
      "recommendation_to_fix": "Ensure all ARIA roles have their required children elements, if any. \n\nResource Link: \nWAI-ARIA Specification - The Roles Model - https://www.w3.org/TR/wai-aria-1.1/#roles \nWAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 4,
      "automation_title": "Certain ARIA roles must be contained by particular parents",
      "modified_alternative": "ARIA roles does not contain required parent roles",
      "expected_results": "The above-mentioned element(s) with [PLACEHOLDER – ADD THE CURRENT ROLE] is provided with the required [PLACEHOLDER – ADD THE MISSING PARENT ROLE].",
      "actual_results": "The above-mentioned element(s) with [PLACEHOLDER – ADD THE CURRENT ROLE] is missing the required [PLACEHOLDER – ADD THE MISSING PARENT ROLE].",
      "recommendation_to_fix": "Ensure all ARIA roles are contained by their required parent element, if any. \n\nResource Link: \nWAI-ARIA Specification - The Roles Model - https://www.w3.org/TR/wai-aria-1.1/#roles \nWAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 5,
      "automation_title": "<li> elements must be contained in a <ul> or <ol>",
      "modified_alternative": "The <li> list item elements are not contained in a <ul> or <ol>",
      "expected_results": "The above-mentioned <li> element(s) is contained within a <ul> or <ol> element.",
      "actual_results": "The above-mentioned <li> element(s) is not contained within a <ul> or <ol> element.",
      "recommendation_to_fix": "Fix this issue by correctly applying <ul>/<li> or <ol>/<li> markup. \n1. Unordered list: Wrap a series of list items (<li>) inside an unordered list element (<ul>). Unordered lists should be used when a set of items can be placed in any order. \n\n<ul> \n<li>Strawberries</li> \n<li>Papaya</li> \n<li>Mangos</li> \n<li>Kiwis</li> \n\u2026 \n</ul> \n\n2. Ordered list: Wrap a series of list items (<li>) inside an ordered list element (<ol>). Ordered lists should be used when the list items need to be placed in a specific order. \n\n<h3>How to boil an egg</h3> \n<ol> \n<li>Place eggs in a large saucepan.</li> \n<li>Cover them with cool water by 1 inch.</li> \n<li>Cover pan with a lid and bring water to a rolling boil over high heat.</li> \n<li>When the water has reached a boil, remove saucepan from the burner.</li> \n<li>Let eggs sit in water for 12 minutes.</li> \n</ol> \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/semantic-structure/lists/semantic-markup \nW3C-WAI tutorial: https://www.w3.org/WAI/tutorials/page-structure/content/#lists"
    },
    {
      "id": 6,
      "automation_title": "<ul> and <ol> must only directly contain <li>, <script> or <template> elements",
      "modified_alternative": "The <ul> and <ol> list markup elements directly contain <li>",
      "expected_results": "The above-mentioned <ul> or <ol> element(s) contain only permitted direct child element(s).\n\n[PLACEHOLDER ADD THE VALID CHILD ELEMENT]",
      "actual_results": "The above-mentioned <ul> or <ol> element(s) contains invalid direct child element(s).\n\n[PLACEHOLDER ADD THE INVALID CHILD ELEMENT]",
      "recommendation_to_fix": "Fix this issue by ensuring that all ordered and unordered lists (defined by ul or ol elements) contain only <li>, <script> or <template> elements as direct children. \n\nResource Link: \nDeque University:https://dequeuniversity.com/class/semantic-structure/lists/semantic-markup"
    },
    {
      "id": 7,
      "automation_title": "Links are not distinguishable without relying on color",
      "modified_alternative": "Link contrast is not at least 3:1 with surrounding text",
      "expected_results": "The above-mentioned link element(s) meets the required 3:1 contrast ratio against the surrounding text.",
      "actual_results": "The above-mentioned link element(s) do not meet the required 3:1 contrast ratio against the surrounding text.\n\n[PLACEHOLDER ADD CONTRAST DETAILS]",
      "recommendation_to_fix": "Fix this issue by using ONE of the following techniques:-\n1. Leave the link text and body text contrast as-is, but add an additional indicator (e.g. underline, outline, etc.) to the link text when it is in its default state.\n2. Increase the contrast between the link text and the body text so that the ratio is at least 3.0 to 1.\n\nResource Link: \nDeque University: https://dequeuniversity.com/class/visual-design/color/distinguish-links-from-text\nWCAG Technique G183: Using a contrast ratio of 3:1 with surrounding text and providing additional visual cues on focus for links or controls where color alone is used to identify them: https://www.w3.org/TR/WCAG20-TECHS/G183.html"
    },
    {
      "id": 8,
      "automation_title": "Elements must meet minimum color contrast ratio thresholds",
      "modified_alternative": "Text content lacks 4.5:1 contrast ratio",
      "expected_results": "The above-mentioned text element(s) meets the required 4.5:1 color contrast ratio.",
      "actual_results": "The above-mentioned text element(s) do not meet the required 4.5:1 color contrast ratio.\n\n[PLACEHOLDER ADD CONTRAST DETAILS]",
      "recommendation_to_fix": "Fix this issue by adjusting the text and/or background to increase the contrast to at least 4.5 to 1. \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/visual-design/contrast/text-against-background"
    },
    {
      "id": 9,
      "automation_title": "Zooming and scaling must not be disabled",
      "modified_alternative": "Zooming and scaling is disabled",
      "expected_results": "Zooming and scaling are enabled on the above-mentioned page.",
      "actual_results": "Zooming and scaling are disabled on the above-mentioned page.",
      "recommendation_to_fix": "Fix the issue by ensuring the zooming and scaling functionality is not disabled."
    },
    {
      "id": 10,
      "automation_title": "Scrollable region must have keyboard access",
      "modified_alternative": "Scrollable region does not have keyboard access",
      "expected_results": "The above-mentioned scrollable region(s) is keyboard accessible.",
      "actual_results": "The above-mentioned scrollable region(s) is not keyboard accessible.",
      "recommendation_to_fix": "Fix this issue by ensuring the component can be used by the keyboard. This includes ensuring controls are:\n1. Focusable with a keyboard (i.e. can be reached using the Tab key or Arrow keys on a keyboard), and\n2. Operable with a keyboard (e.g. links are activated with the Enter key, buttons are activated with Enter and Spacebar, checkboxes are activated with Spacebar, dragging and swiping actions have a keyboard alternative, etc.)\n\nThe best way to do this is to use native HTML elements when HTML equivalents exist (e.g. anchor, button, select, text area, and input elements). When custom (non native HTML) controls have to be used, you must ensure they can be focused with a keyboard (often using tabindex=\"0\") and operated with a keyboard (using JavaScript event handlers). The ARIA Authoring Practices Guide provides information on expected keyboard interaction patterns for custom controls and widgets and working examples (see References below).\n\nResource Link: \nDeque University: https://dequeuniversity.com/class/input-methods/keyboard-input/functionality\nARIA Authoring Practices Guide Patterns: https://www.w3.org/WAI/ARIA/apg/patterns/"
    },
    {
      "id": 11,
      "automation_title": "Documents must have <title> element to aid in navigation",
      "modified_alternative": "The page does not have a programmatic title",
      "expected_results": "The above-mentioned page is provided with a programmatic title.",
      "actual_results": "The above-mentioned page is missing a programmatic title.",
      "recommendation_to_fix": "Fix this issue by using the <title> element in the document <head> to provide an accurate, informative, and (preferably) unique page title.\n\n<html lang=\"en\">\n<head>\n<title>Products and Services</title>\n</head>\n\nResource Link: \nDeque University: https://dequeuniversity.com/class/semantic-structure/page-title/every-page"
    },
    {
      "id": 12,
      "automation_title": "All touch targets must be 24px large, or leave sufficient space",
      "modified_alternative": "Target does not meet minimum size or spacing",
      "expected_results": "The above-mentioned touch target element(s) meets the minimum size or spacing requirements.",
      "actual_results": "The above-mentioned touch target element(s) does not meet the minimum size or spacing requirements.",
      "recommendation_to_fix": "Fix this issue by doing at least ONE of the following:-\n\n1. Ensure that the control has a target size of at least 24 x 24 CSS px.\n\n2. Ensure that a 24 pixel diameter circle centered on the target does not touch another target nor a 24 pixel diameter circle placed on the center of any other adjacent targets that are less than 24 by 24 pixels\n\nResource Link: \nWCAG Understanding document: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum"
    },
    {
      "id": 13,
      "automation_title": "<html> element must have a valid value for the lang attribute",
      "modified_alternative": "The lang attribute value is not valid",
      "expected_results": "The above-mentioned page is provided with a valid lang attribute value.",
      "actual_results": "The above-mentioned page contains an invalid lang attribute value.",
      "recommendation_to_fix": "Fix this issue by providing a correct and valid lang attribute value. \n\nIn the following example, the two-letter code \"en\" specifies English as the primary language of the document. <html lang=\"en\"> \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/semantic-structure/language/primary-language"
    },
    {
      "id": 14,
      "automation_title": "<html> element must have a lang attribute",
      "modified_alternative": "The lang attribute is not programmatically assigned to a page",
      "expected_results": "The above-mentioned page is provided with a programmatically assigned lang attribute.",
      "actual_results": "The above-mentioned page is missing a programmatically assigned lang attribute.",
      "recommendation_to_fix": "Fix this issue by identifying the primary language of the document in the opening <html> element using the lang attribute. \n\nIn the following example, the two-letter code \"en\" specifies English as the primary language of the document. <html lang=\"en\"> \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/semantic-structure/language/primary-language"
    },
    {
      "id": 15,
      "automation_title": "lang attribute must have a valid value",
      "modified_alternative": "Value of the lang attribute is not valid",
      "expected_results": "The above-mentioned element(s) is provided with a valid lang attribute value.\n\n[PLACEHOLDER ADD CORRECT LANG VALUE]",
      "actual_results": "The above-mentioned element(s) contains an invalid lang attribute value.\n\n[PLACEHOLDER ADD INCORRECT LANG VALUE]",
      "recommendation_to_fix": "Fix this issue by providing a valid lang value for the lang attribute. \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/semantic-structure/language/parts"
    },
    {
      "id": 16,
      "automation_title": "Elements must only use supported ARIA attributes",
      "modified_alternative": "Element contains ARIA attributes not allowed for its role",
      "expected_results": "The above-mentioned element(s) uses only supported ARIA attribute(s) for its role.\n\n[PLACEHOLDER ADD SUPPORTED ROLE]",
      "actual_results": "The above-mentioned element(s) contains unsupported ARIA attribute(s) for its role.\n\n\n[PLACEHOLDER ADD UNSUPPORTED ROLE]",
      "recommendation_to_fix": "Fix this issue by using the appropriate ARIA roles, states, and properties. \n\nResource Link:\n- https://www.w3.org/TR/wai-aria-1.1/ \n- https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 17,
      "automation_title": "ARIA commands must have an accessible name",
      "modified_alternative": "ARIA commands are missing an accessible name",
      "expected_results": "The above-mentioned ARIA command element(s) is provided with an accessible name.",
      "actual_results": "The above-mentioned ARIA command element(s) is missing an accessible name.",
      "recommendation_to_fix": "Fix this issue by using any of the following techniques:-\n1. Use the innertext of the <button> or role=\"button\" element\n\n<button>Apply now!</button>\n\n<button class=\"apply-btn\"><span class=\"sr-text\">Apply now!</span></button>\n\n2. Use a non-empty aria-label attribute on the <button> or role=\"button\" element.\n\n<button class=\"apply-btn\" aria-label=\"Apply now!\"></button>\n\n<span role=\"button\" class=\"apply-btn\" aria-label=\"Apply Now!\"></span> \n\nResource Link:\n- https://dequeuniversity.com/class/custom-widgets/concepts/name \n- https://www.w3.org/TR/wai-aria-1.1/#aria-label"
    },
    {
      "id": 18,
      "automation_title": "ARIA hidden element must not be focusable or contain focusable elements",
      "modified_alternative": "The focusable element or contain focusable elements does not contain aria-hidden=\"true\"",
      "expected_results": "The above-mentioned aria-hidden=\"true\" element(s) does not contain focusable element(s).",
      "actual_results": "The above-mentioned aria-hidden=\"true\" element(s) contains focusable element(s).",
      "recommendation_to_fix": "Fix the issue by removing aria-hidden=\"true\" for the focusable and interactive controls.\n\nResource Link:\nWAI-ARIA Recommendation: https://www.w3.org/TR/wai-aria-1.1/\nWAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 19,
      "automation_title": "ARIA input fields must have an accessible name",
      "modified_alternative": "ARIA input fields are missing an accessible name",
      "expected_results": "The above-mentioned ARIA input field element(s) is provided with an accessible name.",
      "actual_results": "The above-mentioned ARIA input field element(s) is missing an accessible name.",
      "recommendation_to_fix": "Fix this issue by using ONE of the following techniques:-\n\n1. Explicit label: Under most circumstances, the best technique is to use the <label> element with the for attribute. The value of the for attribute is the id attribute value of the <input> element.\n\n<label for=\"fname\">First Name:</label> \n<input type=\"text\" name=\"fn\" id=\"fname\">\n\n2. Use an aria-label attribute or title attribute on the <input> to provide a label when there is no visible label.\n\n<input type=\"text\" aria-label=\"search\">\n<input type=\"submit\" value=\"Search\">\n\n3. Use an aria-labelledby attribute on the <input> to reference a visible label. The value of the aria-labelledby attribute is the id attribute value of the visible text label.\n\n<span id=\"nickname\">Nickname:</span>\n<input type=\"text\" aria-labelledby=\"nickname\">\n\nIMPORTANT: If using aria-labelledby to associate form fields and a table header cell, the table headers/labels must be in <span> elements inside the <th>. It is the <span> element and NOT the <th> element that should have the referenced id. If you place the id on the <th> element, some screen readers will not read the labels correctly when you tab through the form elements.\n\n4. Implicit label (explicit label method is strongly preferred): Wrap the form element within the <label> element.\n\n<label>First Name: <input type=\"text\" name=\"fn\"></label>\n\nResource Link: \nDeque University: https://dequeuniversity.com/class/forms/labels/semantic-labels\nW3C-WAI tutorial: https://www.w3.org/WAI/tutorials/forms/"
    },
    {
      "id": 20,
      "automation_title": "Elements must only use permitted ARIA attributes",
      "modified_alternative": "Elements use the non-permitted ARIA attributes",
      "expected_results": "The above-mentioned element(s) uses only permitted ARIA attribute(s).\n\n[PLACEHOLDER ADD SUPPORTED ATTRIBUTE]",
      "actual_results": "The above-mentioned element(s) contains non-permitted ARIA attribute(s).\n\n[PLACEHOLDER ADD SUPPORTED ATTRIBUTE]",
      "recommendation_to_fix": "Fix this issue by using the appropriate ARIA roles, states, and properties. \n\nResource Link: \n- https://www.w3.org/TR/wai-aria-1.1/ \n- https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 21,
      "automation_title": "Required ARIA attributes must be provided",
      "modified_alternative": "Required ARIA attribute missing",
      "expected_results": "The above-mentioned element(s) is provided with all required ARIA attribute(s).",
      "actual_results": "The above-mentioned element(s) is missing required ARIA attribute(s).",
      "recommendation_to_fix": "Fix this issue by using the appropriate ARIA roles, states, and properties. \n\nResource Link: \nWAI-ARIA Recommendation: https://www.w3.org/TR/wai-aria-1.1/ \nWAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 22,
      "automation_title": "ARIA roles used must conform to valid values",
      "modified_alternative": "ARIA roles does not contain valid values",
      "expected_results": "The above-mentioned element(s) is provided with a valid ARIA role.\n\n[PLACEHOLDER ADD SUPPORTED ROLE]",
      "actual_results": "The above-mentioned element(s) contains an invalid ARIA role.\n\n[PLACEHOLDER ADD UNSUPPORTED ROLE]",
      "recommendation_to_fix": "How To Fix: \nFix this issue by using the appropriate ARIA roles, states, and properties. \n\nResource Link: \nWAI-ARIA Recommendation: https://www.w3.org/TR/wai-aria-1.1/ \nWAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 23,
      "automation_title": "ARIA attributes must conform to valid values",
      "modified_alternative": "ARIA attributes does not contain valid values",
      "expected_results": "The above-mentioned ARIA attribute(s) is provided with a valid value.\n\n[PLACEHOLDER ADD SUPPORTED ATTRIBUTE VALUE]",
      "actual_results": "The above-mentioned ARIA attribute(s) contains an invalid value.\n\n[PLACEHOLDER ADD UNSUPPORTED ATTRIBUTE VALUE]",
      "recommendation_to_fix": "Fix the issue by ensuring the value inside each attribute is spelled correctly and corresponds to a valid value. \n\nFor example, aria-hidden=\"true\" would pass, but aria-hidden=\"rtue\" would fail, as would aria-hidden=\"pizza\". \n\nResource Link: \nWAI-ARIA Recommendation: https://www.w3.org/TR/wai-aria-1.1/ \nWAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 24,
      "automation_title": "ARIA attributes must conform to valid names",
      "modified_alternative": "ARIA attributes does not contain valid names",
      "expected_results": "The above-mentioned element(s) uses valid ARIA attribute name(s).",
      "actual_results": "The above-mentioned element(s) contains invalid ARIA attribute name(s).",
      "recommendation_to_fix": "Fix the issue by ensuring the value inside each attribute is spelt correctly and corresponds to a valid name.\n\nResource Link:\nWAI-ARIA Recommendation: https://www.w3.org/TR/wai-aria-1.1/\nWAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/"
    },
    {
      "id": 25,
      "automation_title": "Buttons must have discernible text",
      "modified_alternative": "Button does not have a name",
      "expected_results": "The above-mentioned button element(s) is provided with an accessible name.",
      "actual_results": "The above-mentioned button element(s) is missing an accessible name.",
      "recommendation_to_fix": "Fix this issue by using any of the following techniques:- \n1. Use the innertext of the <button> or role=\"button\" element \n\n<button>Apply now!</button> \n\n<button class=\"apply-btn\"><span class=\"sr-text\">Apply now!</span></button> \n\n2. Use a non-empty aria-label attribute on the <button> or role=\"button\" element. \n\n<button class=\"apply-btn\" aria-label=\"Apply now!\"></button> \n\n<span role=\"button\" class=\"apply-btn\" aria-label=\"Apply Now!\"></span> \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/custom-widgets/concepts/name \nW3C ARIA Recommendation: https://www.w3.org/TR/wai-aria-1.1/#aria-label"
    },
    {
      "id": 26,
      "automation_title": "Frames must have an accessible name",
      "modified_alternative": "Frames are missing an accessible name",
      "expected_results": "The above-mentioned frame element(s) is provided with an accessible name.",
      "actual_results": "The above-mentioned frame element(s) is missing an accessible name.",
      "recommendation_to_fix": "Fix this issue by using ONE of the following techniques:- \n\n1. Use the title attribute. \n\n<iframe title=\"Video of touch screen for the blind in New York City taxis\" src=\"//www.youtube.com/embed/hM0x0k2Bv3Y\"></iframe> \n\n2. Use an aria-labelledby attribute which references the id attribute of visible text on the screen. \n\n<h3 id=\"ts-vid\">Video of touch screen for the blind in New York City taxis</h3> \n<iframe src=\"//www.youtube.com/embed/hM0x0k2Bv3Y\" aria-labelledby=\"ts-vid\"></iframe> \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/semantic-structure/iframes/frame-titles"
    },
    {
      "id": 27,
      "automation_title": "Form elements must have labels",
      "modified_alternative": "Form field is missing an accessible name",
      "expected_results": "The above-mentioned form field element(s) is provided with an accessible name.",
      "actual_results": "The above-mentioned form field element(s) is missing an accessible name.",
      "recommendation_to_fix": "Fix this issue by using ONE of the following techniques:- \n\n1. Explicit label: Under most circumstances, the best technique is to use the <label> element with the for attribute. The value of the for attribute is the id attribute value of the <input> element. \n\n<label for=\"fname\">First Name:</label> \n<input type=\"text\" name=\"fn\" id=\"fname\"> \n\n2. Use an aria-label attribute or title attribute on the <input> to provide a label when there is no visible label. \n\n<input type=\"text\" aria-label=\"search\"> \n<input type=\"submit\" value=\"Search\"> \n\n3. Use an aria-labelledby attribute on the <input> to reference a visible label. The value of the aria-labelledby attribute is the id attribute value of the visible text label. \n\n<span id=\"nickname\">Nickname:</span> \n<input type=\"text\" aria-labelledby=\"nickname\"> \n\nIMPORTANT: If using aria-labelledby to associate form fields and a table header cell, the table headers/labels must be in <span> elements inside the <th>. It is the <span> element and NOT the <th> element that should have the referenced id. If you place the id on the <th> element, some screen readers will not read the labels correctly when you tab through the form elements. \n\n4. Implicit label (explicit label method is strongly preferred): Wrap the form element within the <label> element. \n\n<label>First Name: <input type=\"text\" name=\"fn\"></label> \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/forms/labels/semantic-labels \nW3C-WAI tutorial: https://www.w3.org/WAI/tutorials/forms/"
    },
    {
      "id": 28,
      "automation_title": "Links must have discernible text",
      "modified_alternative": "Link does not have discernible link text",
      "expected_results": "The above-mentioned link element(s) is provided with discernible link text.",
      "actual_results": "The above-mentioned link element(s) is missing discernible link text.",
      "recommendation_to_fix": "Fix this issue by using ONE of the following techniques:- \n\n1.Use link text contained between the opening <a> and closing </a> elements. Link text can be: visible text, CSS clipped text, or alternative text on an <img> element. \n\n<a href=\"https://dequeuniversity.com/contact/\">Contact Us</a> \n\n<a href=\"https://www.facebook.com/dequesystems/\" class=\"fbicon\"><span class=\"sr-text\">Deque's Facebook page</span></a> \n\n<a href=\"http://www.deque.com\"><img src=\"deque_logo.png\" alt=\"Deque Systems\"></a> \n\n2. Use an aria-label attribute or an aria-labelledby attribute to name a link. \n\n<a href=\"https://www.facebook.com/dequesystems/\" class=\"fbicon\" aria-label=\"Deque's Facebook page\"></a> \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/semantic-structure/links/link-text"
    },
    {
      "id": 29,
      "automation_title": "Interactive controls must not be nested",
      "modified_alternative": "Interactive elements contain nested focusable elements",
      "expected_results": "The above-mentioned interactive element(s) does not contain nested interactive element(s).",
      "actual_results": "The above-mentioned interactive element(s) contains nested interactive element(s).",
      "recommendation_to_fix": "Fix this issue by ensuring that button and link elements do not contain other button or link elements or any other interactive elements. \n\nResource Link: \nDeque University: https://dequeuniversity.com/class/semantic-structure/parsing-and-validity/ \nHTML5 spec: https://www.w3.org/TR/html52/sec-forms.html#the-button-element \nHTML5 spec: https://www.w3.org/TR/html52/textlevel-semantics.html#the-a-element"
    },
    {
      "id": 30,
      "automation_title": "Select element must have an accessible name",
      "modified_alternative": "Select element does not have an accessible name",
      "expected_results": "The above-mentioned select element(s) is provided with an accessible name.",
      "actual_results": "The above-mentioned select element(s) is missing an accessible name.",
      "recommendation_to_fix": "Fix this issue by using ONE of the following techniques:- \n1. Use an HTML <select> element with <option> elements to create the drop-down menu. \n2. Use the ARIA combobox design pattern. View the full ARIA design pattern for a combobox including expected keyboard interactions and examples: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ \n\nResource Link: \nW3C HTML5 Recommendation: https://www.w3.org/TR/html5/sec-forms.html#the-select-element \nWAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/"
    }
  ],
  "TEMPLATE_FIELDS": [
    {
      "key": "platformUrl",
      "label": "Platform URL",
      "type": "text",
      "default": "https://cpcontents.adobe.com/public/newlearner/newlearner_80102719.html#/overviewPage?loId=72298&loType=certification"
    },
    {
      "key": "authState",
      "label": "Authentication State",
      "type": "text",
      "default": "Logged in"
    },
    {
      "key": "os",
      "label": "Operating System",
      "type": "text",
      "default": "Windows (Version: 11 Pro)"
    },
    {
      "key": "browser",
      "label": "Browser",
      "type": "text",
      "default": "Chrome (Version: 140.0.7339.128)"
    },
    {
      "key": "tool",
      "label": "Testing Tool",
      "type": "text",
      "default": "Chrome on Windows using axe DevTools Chrome browser extension"
    },
    {
      "key": "steps",
      "label": "Steps to Reproduce",
      "type": "textarea",
      "default": "1. Open the URL mentioned above.\n2. Press F12 to open the browser Inspect panel.\n3. Run the Axe DevTools extension.\n4. Observe the \"Description here\" issue for the below-mentioned element(s)."
    },
    {
      "key": "expectedResults",
      "label": "Expected Results",
      "type": "textarea",
      "default": ""
    },
    {
      "key": "actualResults",
      "label": "Actual Results",
      "type": "textarea",
      "default": ""
    },
    {
      "key": "affectedUsers",
      "label": "Affected User Population",
      "type": "textarea",
      "default": ""
    },
    {
      "key": "wcagSc",
      "label": "Applicable WCAG Success Criterion",
      "type": "text",
      "default": ""
    },
    {
      "key": "codeSnippet",
      "label": "Code Snippet",
      "type": "textarea",
      "default": ""
    },
    {
      "key": "remediation",
      "label": "Remediation Recommendation",
      "type": "textarea",
      "default": ""
    },
    {
      "key": "screenName",
      "label": "Screen Name",
      "type": "text",
      "default": ""
    },
    {
      "key": "labels",
      "label": "Labels",
      "type": "textarea",
      "default": ""
    },
    {
      "key": "updatedTitle",
      "label": "Update summary in adobe format",
      "type": "text",
      "default": ""
    }
  ]
};