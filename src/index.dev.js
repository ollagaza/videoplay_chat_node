import os from 'os';

process.env.NODE_ENV = 'development';
process.env.HOSTNAME = os.hostname();

require('./index.js');