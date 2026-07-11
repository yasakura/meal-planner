export const env = {
  name: import.meta.env.VITE_ENV ?? 'dev',
  firebase: {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'non configuré',
  },
};
