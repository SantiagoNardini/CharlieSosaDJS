document.querySelector(function() {
  document.querySelector('.scroll-down').click (function() {
    document.querySelector('html, body').animate({scrollTop: document.querySelector('footer').offset().top}, 'slow');
    return false;
  });
});