import path from 'node:path';

/** Where uploaded files are stored. Run the server from the `server` folder (npm scripts do). */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
