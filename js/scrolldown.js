$(function() {
    $('.scroll-down').click (function() {
      $('html, body').animate({scrollTop: $('footer').offset().top }, 'slow');
      return false;
    });
  });