(function () {
  var socket = io.connect('/socket');
  socket.on('error', function (reason) {
    console.error(reason);
  });
  socket.on('connect', function () {
    document.getElementById('unauthorized').style.display = 'none';
    document.getElementById('authorized').style.display = 'block';
    setInterval(function () {
      socket.emit('increment', function (data) {
        document.getElementById('val').innerText = data;
      });
    }, 1e3);
  });
})();