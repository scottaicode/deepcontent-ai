// Re-export Firebase services from the main firebase.ts file
// This ensures we use a single Firebase app instance throughout the application

import { app, auth, db, storage, functions } from './firebase';

// Export Firebase services
export { app, auth, db, storage, functions }; 