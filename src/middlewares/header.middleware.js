export default (req, res, next) => {
  res.header('Vary', 'Origin');
  res.header('Cache-Control', 'post-check=0, pre-check=0, no-store, no-cache, must-revalidate');
  res.header('Expires', 'Mon, 26 Jul 1997 05:00:00 GMT');
  res.header('Server', 'Apache/2.2.15 (CentOS)');
  res.header('Pragma', 'no-cache');
  // res.header('X-Powered-By', 'PHP/5.2.17');

  // Worker ID 표현
  // res.header('X-Worker-ID', cluster.worker.id);

  next();
}
