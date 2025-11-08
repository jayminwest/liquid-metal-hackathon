import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Middleware
app.use('/*', cors());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Raindrop CRUD endpoints placeholder
app.get('/raindrop', (c) => {
  return c.json({ message: 'Get all items from Raindrop' });
});

app.get('/raindrop/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ message: `Get item ${id} from Raindrop` });
});

app.post('/raindrop', async (c) => {
  const body = await c.req.json();
  return c.json({ message: 'Create item in Raindrop', data: body }, 201);
});

app.put('/raindrop/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  return c.json({ message: `Update item ${id} in Raindrop`, data: body });
});

app.delete('/raindrop/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ message: `Delete item ${id} from Raindrop` });
});

const port = process.env.PORT || 3000;

console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
