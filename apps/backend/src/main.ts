import { serverConfig } from './configs/server.config';
import { createServer } from './server/server';

createServer(serverConfig).then((server) => server.start());