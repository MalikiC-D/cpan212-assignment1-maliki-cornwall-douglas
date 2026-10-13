import app from './app.js';
import { config } from './config.js';

// A promise nobody handled should be logged, not crash the server.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

app.listen(config.port, () => {
  console.log(`City Weather API listening on http://localhost:${config.port}`);
});
