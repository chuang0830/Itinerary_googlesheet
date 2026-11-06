import type { TranslationKey } from '../translations';
const en: Record<TranslationKey, string> = {
  tripName: 'Trip name',
  subtitle: 'Subtitle',
  tripSubtitle: 'Trip subtitle',
  startDate: 'Start date',
  endDate: 'End date',
  themeColor: 'Theme color',
  forestGreen: 'Forest green',
  oceanBlue: 'Ocean blue',
  berryPurple: 'Berry purple',
  warmTerracotta: 'Warm terracotta',
  createNewTrip: 'Create a new trip',
  createTrip: 'Create trip',
  newTripPreview: 'Trip preview · Not created yet',
  liveTripPreview: 'Live trip preview',
  tripNamePlaceholder: 'e.g. Thailand Trip',
  subtitlePlaceholder: 'e.g. Bangkok & Chiang Mai',
  publicSharingConsent:
    'I understand: anyone with the link can view the new spreadsheet and its contents. Do not include sensitive information.',
  processingPleaseWait: 'Processing, please wait…',
  processing: 'Processing…',
  creatingSpreadsheet: 'Creating spreadsheet…',
  retryPublicSharing: 'Retry public sharing',
  checkCreationProgress: 'Check creation progress',
  openTheCreatedGoogleSheet: 'Open the created Google Sheet',
  startAgain: 'Start again',
  checkGoogleDrive: 'Check Google Drive',
  clearLocalProgressAfterChecking: 'Clear local progress after checking',
  unableToCheckCreationProgress: 'Unable to check creation progress.',
  creationIsIncompleteCheckProgressBeforeRetrying:
    'Creation is incomplete. Check progress before retrying.',
  publicSharingFailed: 'Public sharing failed.',
  publicSharingFailedCheckProgressAndRetry: 'Public sharing failed. Check progress and retry.',
  connectionInterruptedCheckProgressToAvoidCreatingDuplicates:
    'Connection interrupted. Check progress to avoid creating duplicates.',
  clearCreationProgressConfirm:
    'Check Google Drive for an existing spreadsheet first. Clearing progress and creating again may create duplicates. Clear progress?',
  tripMenu: 'Trip menu',
  menuItinerary: '📅 Trip itinerary',
  menuAccommodation: '🏨 Accommodation',
  menuTransportation: '🚆 Transportation',
  menuSettings: '⚙️ Settings',
  menuGoogleSheets: '📊 Open Google Sheets ↗',
  signOut: 'Sign out',
  googleSignIn: 'Sign in with Google',
  completeSignIn: 'Complete sign-in',
  refresh: 'Refresh',
  retryLoading: 'Retry loading',
  itineraryUnavailable: 'Unable to display itinerary',
  copyDraft: 'Copy draft',
  discardDraftAndReload: 'Discard draft and reload',
  editPlansHelp: 'Edit plans and links, or drag to reorder · Done to save / Cancel to discard',
  refreshingGoogleSheets: 'Refreshing Google Sheets…',
  loadedFromGoogleSheets: 'Loaded from Google Sheets',
  loading: 'Loading…',
  googleSheetsHasNotLoaded: 'Google Sheets has not loaded',
  tripSharingHelp:
    'Anyone with the link can view this trip. Editors can choose Edit, then Done to save or Cancel to discard. You can also edit Google Sheets and refresh.',
  changesAreSavedOnlyWhenYouChooseDone: 'Changes are saved only when you choose Done.',
  hotelName: 'Hotel name',
  city: 'City',
  checkIn: 'Check-in date',
  checkOut: 'Check-out date',
  mapUrl: 'Google Maps link',
  transportType: 'Transport type',
  departurePlace: 'From',
  destination: 'To',
  departureDate: 'Departure date',
  departureTime: 'Departure time',
  arrivalDate: 'Arrival date',
  arrivalTime: 'Arrival time',
  carrier: 'Airline / operator',
  serviceNumber: 'Flight / service number',
  accommodationTitle: 'Accommodation',
  transportationTitle: 'Transportation',
  checkInIncludesThatNightCheckOutDoesNot: 'Check-in includes that night; check-out does not.',
  transportationHelp:
    'Add multiple transport records. Departure and arrival dates appear in the daily cards.',
  accommodation: 'Accommodation',
  transportation: 'Transportation',
  delete: 'Delete',
  flightOption: '✈ Flight',
  trainOption: '🚆 Train',
  busOption: '🚌 Bus',
  otherOption: 'Other',
  addAccommodation: 'accommodation',
  addTransportation: 'transportation',
  noRecordsPrefix: 'No records: ',
  noRecordsSuffix: '.',
  chooseEditToAddARecord: 'Choose Edit to add a record.',
  openLink: 'Open link ↗',
  backToItinerary: '← Back to itinerary',
  chooseDoneToSaveOrCancelToDiscardChanges: 'Choose Done to save or Cancel to discard changes.',
  unsavedChangesDoneToSaveCancelToDiscard: 'Unsaved changes. Done to save / Cancel to discard.',
  unsavedChangesChooseDoneToSave: 'Unsaved changes. Choose Done to save.',
  cancelledUnsavedChangesDiscarded: 'Cancelled. Unsaved changes discarded.',
  cancelledUnsavedSettingsDiscarded: 'Cancelled. Unsaved settings discarded.',
  draftCopied: 'Draft copied.',
  settingsDraftCopied: 'Settings draft copied.',
  unableToCopyKeepACopyOfTheContentOnScreen:
    'Unable to copy. Keep a copy of the content on screen.',
  unableToEnterEditMode: 'Unable to enter edit mode.',
  unableToRefresh: 'Unable to refresh.',
  unableToRefreshGoogleSheets: 'Unable to refresh Google Sheets.',
  unableToLoadGoogleSheetsPleaseTryAgainLater:
    'Unable to load Google Sheets. Please try again later.',
  saveFailedTryDoneAgain: 'Save failed. Try Done again.',
  connectionFailedYourDraftIsKeptTryDoneAgain:
    'Connection failed. Your draft is kept. Try Done again.',
  connectionInterruptedYourDraftIsKeptTryDoneAgain:
    'Connection interrupted. Your draft is kept. Try Done again.',
  shareThisTrip: 'Share this trip',
  menuShareTrip: '👥 Share trip',
  closeSharingDialog: 'Close sharing dialog',
  shareDialogHelp:
    'Anyone with the link can view without signing in. Sharing the link does not grant editing access. Add collaborators through Google Sheets sharing settings.',
  tripUrl: 'Trip URL',
  copyTripUrl: 'Copy trip URL',
  shareWithAnotherApp: 'Share with another app',
  tripUrlCopied: 'Trip URL copied.',
  unableToCopyAutomaticallySelectTheUrlAboveAndCopyItManually:
    'Unable to copy automatically. Select the URL above and copy it manually.',
  sharedSuccessfully: 'Shared successfully.',
  unableToOpenSharingCopyTheUrlInstead: 'Unable to open sharing. Copy the URL instead.',
  localSharingWarning:
    'This is a local URL. Friends cannot open it on their own devices. Share the website URL after deployment.',
  loadingMembers: 'Loading…',
  retry: 'Retry',
  membersAreTemporarilyUnavailable: 'Members are temporarily unavailable.',
  thisAccountCannotAccessMemberInformation: 'This account cannot access member information.',
  membersAccessDenied:
    'Google has not allowed this account to read the member list. You can still view the public itinerary.',
  yourSessionHasExpiredYouCanStillViewThePublicItinerary:
    'Your session has expired. You can still view the public itinerary.',
  readOnlyNotice:
    'You are signed in. This Google account has view-only access. To edit, ask the trip owner to add this account as an editor in Google Sheets sharing settings.',
  fileAuthorizationRequired:
    'Authorization is incomplete. Complete sign-in to check editing access for this trip.',
  settingsTitle: 'Settings',
  updateTripDetailsAndThemeThenChooseDoneToApply:
    'Update trip details and theme, then choose Done to apply.',
  tripDetails: 'Trip details',
  customColorPrefix: 'Current custom color: ',
  customColorSuffix: '. Keep it or select a theme above.',
  dateRangeHelp:
    'Shortening the date range does not delete plans. Records outside the range remain in Sheets but are hidden from the date selector.',
  draftPreviewUnsaved: 'Draft preview · Unsaved',
  themePreview: 'Theme preview',
  doneToSaveCancelToDiscardChangesAreNotSavedAutomatically:
    'Done to save / Cancel to discard. Changes are not saved automatically.',
  accessCheckFailed:
    'You are signed in, but editing access could not be checked. Refresh later. Your session is retained.',
  authorizationCancelled:
    'Google authorization was cancelled. Editing is disabled. Complete sign-in to retry.',
  authorizationIncomplete:
    'Google authorization is incomplete. Use the same account and select this trip. Editing is disabled until authorization succeeds.',
  languageLabel: 'Website language',
  chineseLanguage: 'Traditional Chinese',
  englishLanguage: 'English',
  tripBoardLabel: 'TRIP BOARD · ',
  stayLabel: 'STAY · ',
  tripTagline: 'One trip. One Google Sheet.',
  publicSharingTitle: 'About public sharing',
  publicSharingDescription:
    'Creating a trip makes its spreadsheet viewable by anyone with the link. Do not include sensitive information.',
  privacyPolicy: 'Privacy policy',
  enterTheTripDetails: 'Enter the trip details.',
  pleaseAcceptThePublicSharingNoticeFirst: 'Please accept the public sharing notice first.',
  tripNameMustContain1100Characters: 'Trip name must contain 1–100 characters.',
  subtitleMustNotExceed200Characters: 'Subtitle must not exceed 200 characters.',
  enterValidDatesTheEndDateCannotPrecedeTheStartDate:
    'Enter valid dates. The end date cannot precede the start date.',
  invalidThemeColor: 'Invalid theme color.',
  chooseChineseOrEnglish: 'Choose Chinese or English.',
  spreadsheetCreatedSettingUpPublicViewing: 'Spreadsheet created. Setting up public viewing…',
  publicSharingFailedRetry:
    'Spreadsheet created, but public sharing is not confirmed. Retry sharing; another spreadsheet will not be created.',
  creationRejectedRetry:
    'Google rejected the creation request. Check authorization and API settings, then retry.',
  creationResultUncertain:
    'Unable to confirm whether Google created the spreadsheet. Automatic retries are stopped to prevent duplicates. Check Google Drive first.',
  enableGoogleSheetsApiAndDriveApiInTheSameCloudProject:
    'Enable Google Sheets API and Drive API in the same Cloud project.',
  creationProgressUncertain:
    'Unable to confirm creation progress. Check Google Drive first to avoid duplicates.',
  publicSharingIsNotConfirmedPleaseRetry: 'Public sharing is not confirmed. Please retry.',
  creationRejected: 'Google rejected the creation request. Check authorization and API settings.',
  publicSharingNotConfirmed:
    'Spreadsheet created, but public sharing is not confirmed. Retry sharing.',
  enterTheSettings: 'Enter the settings.',
  invalidSettingsFormat: 'Invalid settings format.',
  theTripDateRangeIsTooLargeCheckTheStartAndEndDates:
    'The trip date range is too large. Check the start and end dates.',
  settingsContainFormulas:
    'Settings contains formulas. Convert them to plain text in Sheets before editing.',
  thisAccountDoesNotHaveEditingAccess: 'This account does not have editing access.',
  invalidEditingVersionReloadThePage: 'Invalid editing version. Reload the page.',
  editingAccessWasRemovedKeepYourDraft: 'Editing access was removed. Keep your draft.',
  settingsWasChangedBySomeoneElseCopyYourDraftThenReload:
    'Settings was changed by someone else. Copy your draft, then reload.',
  savedSettingsDoNotMatchTheExpectedValuesKeepYourDraftAndReload:
    'Saved settings do not match the expected values. Keep your draft and reload.',
  connectionFailedYourDraftIsRetainedChooseDoneToRetry:
    'Connection failed. Your draft is retained. Choose Done to retry.',
  unableToCopyKeepACopyOfTheDraftOnScreen: 'Unable to copy. Keep a copy of the draft on screen.',
  yourSessionExpiredSignInAgainUnsavedDraftsAreRetained:
    'Your session expired. Sign in again. Unsaved drafts are retained.',
  unableToConfirmEditingAccessRefreshLater: 'Unable to confirm editing access. Refresh later.',
  signInServiceUnavailable:
    'The sign-in service is temporarily unavailable. Retry later; you do not need to sign in again.',
  unableToCompleteTheOperationKeepYourDraftAndRetry:
    'Unable to complete the operation. Keep your draft and retry.',
  saveResultUncertain:
    'Connection interrupted. Keep your draft and retry Done. The save result still needs confirmation.',
  googleAuthorizationExpiredKeepYourDraftAndSignInAgain:
    'Google authorization expired. Keep your draft and sign in again.',
  fileAccessUnconfirmed:
    'Editing access for this spreadsheet is not confirmed. Complete sign-in and file selection. Only Google Sheets editors can save.',
  googleSheetsCannotSaveRightNowKeepYourDraftAndRetry:
    'Google Sheets cannot save right now. Keep your draft and retry.',
  invalidItineraryFormatOrTooManyPlans: 'Invalid itinerary format or too many plans.',
  invalidItineraryFormat: 'Invalid itinerary format.',
  activityNamesAndMapLinksMustBeText: 'Activity names and map links must be text.',
  checkActivityNamesUpTo2000CharactersAndLinks:
    'Check activity names (up to 2000 characters) and links.',
  mapLinksMustBeCompleteHttpSUrls: 'Map links must be complete http(s) URLs.',
  invalidItineraryDateFormat: 'Invalid itinerary date format.',
  invalidRecordFormatOrMoreThan1000Records: 'Invalid record format or more than 1000 records.',
  checkTheRecordFormat: 'Check the record format.',
  signedInAs: 'Signed in: ',
  edit: 'Edit',
  done: 'Done',
  cancel: 'Cancel',
  todaysPlans: "Today's plans",
  noPlansToday: 'No plans for today yet.',
  noPlansAddBelow: 'No plans for today yet. Add one below.',
  addPlanLegacy: '＋　Add a plan',
  mapLinkPlaceholder: 'Add a map or place link (optional)',
  tripBoard: 'TRIP BOARD',
  newJourney: 'A NEW JOURNEY',
  sharedTripBoard: 'Shared trip board',
  whoSharesTripBoard: 'who is sharing trip board ?',
  shareTrip: 'Share this trip',
  shareButton: '↗ Share',
  saving: 'Saving…',
  synced: 'Synced with Google Sheets',
  syncFailedRetryDone: 'Sync failed. Retry Done.',
  chooseDay: 'Choose a day',
  itineraryCards: 'Itinerary cards',
  editItineraryCards: 'Edit itinerary cards',
  dailyTravelInfo: 'Accommodation and transportation',
  add: '＋ Add',
  stay: 'STAY',
  openGoogleSheets: 'Open Google Sheets ↗',
  flight: 'Flight',
  train: 'Train',
  bus: 'Bus',
  otherTransport: 'Other',
  plan: 'Plan',
  planLink: 'Link for plan',
  deletePlan: 'Delete plan',
  reorderPlan: 'Reorder plan',
  openMap: 'Open map:',
  nextJourney: 'YOUR NEXT JOURNEY',
  addPlan: '＋ Add a plan',
  syncFailed: 'Sync failed. Retry.',
  createTripSignInLabel: 'Sign in to create a trip',
  googleSignInNotConfigured: 'Google sign-in is not configured. Complete the website setup first.',
  createTripSignInFailed:
    'Google sign-in or authorization was not completed. Try again to create your trip.',
  createTripSignInHelp:
    'Sign in with Google using the button below. You will return here to create your trip.',
  googleSignInAndCreateTrip: 'Sign in with Google to create a trip',
  loadingTrip: 'Loading trip…',
  loadingTripDescription: 'Fetching the latest data from Google Sheets.',
  privacyEyebrow: 'TRAVEL PLANNER · PRIVACY',
  privacyUpdated: 'Last updated: November 4, 2026',
  privacyIntro:
    'Travel Planner is a website for managing and sharing trips with Google Sheets. This policy explains what data the service processes, why it is used, how it is stored, and how you can control it.',
  privacyDataTitle: 'Data we use and why',
  privacyAccountData:
    'Google account identifier, name, and email: to identify signed-in users, display account information, and identify the user creating a trip.',
  privacyOAuthData:
    'Google OAuth credentials: to call Google APIs on the server on behalf of the current user. Access tokens and refresh tokens are not provided to the browser.',
  privacyTripData:
    'Trip spreadsheets: to read and update Settings, Itinerary, Accommodation, and Transportation, providing trip details, ordering, accommodation, transportation, and settings.',
  privacyCollaboratorData:
    'File permissions and collaborator information: to check whether the current account can edit and display collaborator names, roles, and account initials to signed-in users whom Google permits to access the file.',
  privacyScopes:
    'We currently request basic account information and the drive.file scope to access files created through or separately authorized for this application. We do not request access to your entire Google Drive. Google Sheets sharing access does not automatically authorize this application to access the file.',
  privacyPublicTitle: 'Public trips and sharing permissions',
  privacyPublicNotice:
    'Before creating a trip, you must confirm that the new spreadsheet will be viewable by anyone with the link. Anyone with the website or spreadsheet link can read trip content without signing in. Do not include sensitive information such as passports, payment details, or booking passwords.',
  privacyPermissions:
    'Editing permissions are managed by Google Sheets and Drive. Each write uses the current user’s own authorization. Sharing the website URL does not grant editing access. Signed-out visitors cannot access the collaborator list. Signed-in viewers may see member information that Google permits, but this does not grant editing rights.',
  privacyStorageTitle: 'Data storage and security',
  privacyTripStorage:
    'The spreadsheet in your Google Drive is the sole persistent source of trip content. We do not maintain a separate trip-content database. The website temporarily processes trip content when handling requests and displaying pages.',
  privacySessionStorage:
    'In production, Upstash Redis stores sign-in data encrypted with AES-256-GCM. Sessions last up to 24 hours; sign-in flow data lasts up to 10 minutes. Signing out deletes the current session. Trip-creation request summaries, status, and spreadsheet identifiers are temporarily stored for up to 24 hours to prevent duplicate creation and support sharing retries; they do not include trip content.',
  privacyBrowserStorage:
    'The browser uses necessary sign-in cookies and may store trip-creation request identifiers in session storage to recover creation progress. Unsaved editing drafts remain in page memory and are not written to Google Sheets until you choose Done.',
  privacyProvidersTitle: 'Service providers and data sharing',
  privacyProviders:
    'Google provides sign-in, Sheets, and Drive features; Vercel hosts the website and server; Upstash stores the temporary data described above. Providers process data necessary to deliver the service, potentially outside your country. Hosting services may process operational records such as IP addresses, request times, and errors; retention depends on provider policies and service configuration.',
  privacyNoSale:
    'We do not sell Google user data or use it for advertising, data brokerage, or training general-purpose AI models.',
  privacyGooglePolicyPrefix:
    'Our use and transfer of Google API and Google Workspace data complies with the ',
  privacyGooglePolicySuffix: ', including the Limited Use requirements.',
  privacyControlTitle: 'Revoking access, deleting data, and contact',
  privacySignOut:
    'Use Sign out to delete the current session. Sign out separately on other devices, or wait for those sessions to expire.',
  privacyRevokePrefix: 'You can revoke this service’s authorization in your ',
  privacyConnectionsLink: 'Google Account third-party connections settings',
  privacyRevokeSuffix:
    '. Revoking authorization does not automatically delete spreadsheets or disable their public sharing.',
  privacyDeleteTrip:
    'You can delete trip files in Google Drive or modify them in Google Sheets. Use Sheets sharing settings to remove editors or disable link-based public access. Once public access is disabled, this website can no longer publicly display the trip.',
  privacyContactPrefix:
    'For questions about data use or requests to delete data, contact the service administrator at ',
  privacyContactSuffix:
    '. Do not include Google passwords, OAuth tokens, or other secrets in your email.',
  privacyUpdatesTitle: 'Policy updates',
  privacyUpdates:
    'If our data-handling practices change, we will update this page and its update date. New Google authorization scopes will require separate user authorization.',
  privacyBackHome: '← Back to home',
  privacyEnglishSwitch: 'Use English',
};
export default en;
