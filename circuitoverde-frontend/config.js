// Aberto pelo arquivo (duplo clique) usa localhost:3000; servido pela API usa o mesmo endereço
window.API_URL = location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api';
