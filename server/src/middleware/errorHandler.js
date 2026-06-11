const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  if (err.type === 'validation') {
    return res.status(400).json({ error: 'Validation Error', message: err.message, details: err.details });
  }

  if (err.type === 'not_found') {
    return res.status(404).json({ error: 'Not Found', message: err.message });
  }

  if (err.type === 'conflict') {
    return res.status(409).json({ error: 'Conflict', message: err.message });
  }

  if (err.type === 'forbidden') {
    return res.status(403).json({ error: 'Forbidden', message: err.message });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Conflict', message: 'A record with this value already exists' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Bad Request', message: 'Referenced record does not exist' });
  }

  res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred' });
};

export default errorHandler;
