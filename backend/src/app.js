const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const healthRoutes = require('./routes/health-routes');
const dashboardRoutes = require('./routes/dashboard-routes');
const balanceRoutes = require('./routes/balance-routes');
const currencyRoutes = require('./routes/currency-routes');
const transactionRoutes = require('./routes/transaction-routes');
const chatbotRoutes = require('./routes/chatbot-routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error-handler');

const app = express();

app.locals.env = env;

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

app.use('/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
