// Role options shown on the onboarding screen. Add a new entry to offer another role.
export const ROLE_OPTIONS = [
  {
    id: 'patient',
    title: 'I am a Patient',
    description: 'Looking to track medical records, search terms, and schedule reminders.',
    icon: 'heart-outline', // Ionicons name
    iconColor: '#087F78',
    tint: 'bg-primary-light', // NativeWind class for the icon tile background
  },
  {
    id: 'doctor',
    title: 'I am a Doctor',
    description: 'Managing patient updates, reviewing clinical reports, and verifying terminology.',
    icon: 'medical-outline',
    iconColor: '#5D78D6',
    tint: 'bg-secondary-light',
  },
];
