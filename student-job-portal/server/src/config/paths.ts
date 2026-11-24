import path from 'node:path';

/** Where uploaded files are stored. Run the server from the `server` folder (npm scripts do). */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');


/** Profile photos live here. They are served publicly at /avatars (random file names, nothing else is in this folder). */
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');