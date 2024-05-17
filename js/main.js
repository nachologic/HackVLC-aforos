$(function () {
  /*
    * Global Variables/ functions.
    * Worker Helper functions.
    * Form Submission.
    * Page Render
  */

  /*----- Global Variables -----*/
  var roomCheck = null;
  window.mylocation = localStorage.getItem('mylocation') || null; // Initialize window.mylocation from localStorage if not already set

  /*----- Worker Helper functions -----*/
  function callWorker(url, method, callback) {
    const Http = new XMLHttpRequest();
    Http.open(method, url);

    Http.send();
    Http.onreadystatechange = (e) => {
      if (Http.readyState === 4) {
        var resp = JSON.parse(Http.response);
        if (resp.error) {
          window.alert(resp.error);
          return false;
        } else {
          callback(resp);
        }
      }
    }
  }

  function processURL() {
    var $url = new URL(window.location);
    var $mylocation = $url.searchParams.get("i");

    if ($mylocation) {
      window.mylocation = $mylocation;
      localStorage.setItem('mylocation', $mylocation); // Store in localStorage
    } else if (window.mylocation) {
      // If `i` is not in the URL but is stored in window.mylocation, update the URL to include it
      $url.searchParams.set("i", window.mylocation);
      window.history.replaceState({}, "", $url);
    } else {
      console.error("No valid location found");
      return; // Exit if no valid location is found
    }

    var $external = $url.searchParams.get("ex");
    var $cookie = getCookie('hideCookie');

    if ($cookie === "") {
      $('.cookie-banner.d-none').removeClass('d-none');
    }
    if ($external) {
      $('.edit-col, .user, #edit-max, #max-change, #qrmodal').remove();
    }
    if (window.mylocation) {
      var apiURL = "https://myaiprofesor.com/space/" + window.mylocation;

      callWorker(apiURL, "GET", updateRoom);
      roomCheck = setTimeout(function () { processURL() }, 2000);
    }
  }

  /*----- Form Submission -----*/
  $('#room').submit(function (e) {
    e.preventDefault();

    var $total = $('#starting_oc').val();
    var $max = $('#max_oc').val();
    var $name = $('#room_name').val();
    if (!$total) {
      $total = 0;
    }
    if (!$max) {
      $max = 0;
    }
    if ($name) {
      $name = "/name/" + encodeURIComponent($name);
    } else {
      $name = "";
    }
    var $url = "https://myaiprofesor.com/space/new/occupancy/current/" + $total + "/max/" + $max + $name;

    callWorker($url, "PUT", function (returnData) {
      window.mylocation = returnData.space_id; // Store room ID in global variable
      localStorage.setItem('mylocation', window.mylocation); // Store in localStorage
      var getUrl = window.location;
      var $new_url = getUrl.protocol + "//" + getUrl.host + "/" + "room/?i=" + window.mylocation;
      window.location.href = $new_url;
    });
    return false;
  });

  $('#m').submit(function (e) {
    e.preventDefault();
    var $total = window.currentOccupancy;
    if (($total - 1) >= 0) {
      var $mylocation = window.mylocation;
      if ($mylocation) {
        var $url = "https://myaiprofesor.com/space/" + $mylocation + "/decrement";
        $('.blur').removeClass('d-none');
        roomCheck = null;
        callWorker($url, "PUT", updateRoom);
      } else {
        console.error("No valid location found");
      }
    }
    if (($total - 1) === 0) {
      $('.btn-minus').attr('disabled', "disabled").addClass('disabled');
    }
    return false;
  });

  $('#p').submit(function (e) {
    e.preventDefault();
    var $mylocation = window.mylocation;
    if ($mylocation) {
      var $url = "https://myaiprofesor.com/space/" + $mylocation + "/increment";
      $('.blur').removeClass('d-none');
      roomCheck = null;
      callWorker($url, "PUT", updateRoom);
    } else {
      console.error("No valid location found");
    }
    return false;
  });

  $('#max-value-form').submit(function () {
    var $max = parseInt($('#max-value').val());
    var $mylocation = window.mylocation;
    if ($mylocation) {
      var $url = "https://myaiprofesor.com/space/" + $mylocation + "/max/" + $max;
      $('.blur').removeClass('d-none');
      callWorker($url, "PUT", updateRoom);
      $('#max-change').find('.close').trigger('click');
    } else {
      console.error("No valid location found");
    }
    return false;
  });

  $('#contact').submit(function () {
    var $obj = {
      "call": 'contact',
      "email": $('#email').val(),
      'message': $('#message').val(),
    };
    const Http = new XMLHttpRequest();
    Http.open("POST", 'https://myaiprofesor.com');
    Http.setRequestHeader('Accept', 'application/json');
    Http.setRequestHeader('Content-Type', 'application/json');
    Http.send(JSON.stringify($obj));

    Http.onreadystatechange = (e) => {
      if (Http.readyState === 4) {
        var resp = JSON.parse(Http.response);
        if (resp.error) {
          window.alert(resp.error);
          return false;
        } else {
          $('#contact').html(resp.message);
        }
      }
    }

    return false;
  });

  /*----- Page Render Functions -----*/

  function updateRoom(data) {
    $('#current').text(parseInt(data.occupancy.current));
    window.currentOccupancy = parseInt(data.occupancy.current);
    if (data.occupancy.current === 0) {
      $('.btn-minus').attr('disabled', "disabled").addClass('disabled');
    } else {
      $('.btn-minus').attr('disabled', false).removeClass('disabled');
    }
    $('#max').text(parseInt(data.occupancy.maximum));
    if (data.space_name) {
      $('.room_name').text(decodeURIComponent(data.space_name));
    }
    calculateGraph();
    $('.blur').removeClass('full-blur').addClass('d-none');
    clearTimeout(roomCheck);
    roomCheck = setTimeout(function () { processURL() }, 2000);
  }

  // Calculate Percentage for graph
  function calculateGraph() {
    var current = $('#current').text();
    var maximum = $('#max').text();
    if (maximum !== 0) {
      var percentage = (current * 100 / maximum);
      $('#progress-bar').css('width', percentage + "%");
      if (percentage > 100) {
        overCapacity();
      } else if (percentage >= 80 && percentage <= 100) {
        yellowWarning();
      } else {
        normalize();
      }
    }
  }

  //almost at capacity
  function yellowWarning() {
    $('#progress-bar').removeClass("red");
    $('#current').removeClass("red-text");
    $('#nav-color').removeClass("red");
    $('#over-capacity').addClass("d-none");
    $('#progress-bar').addClass("yellow");
  }

  //over capacity
  function overCapacity() {
    $('#progress-bar').addClass("red");
    $('#current').addClass("red-text");
    $('#nav-color').addClass("red");
    $('#over-capacity').removeClass("d-none");
  }

  //back to normal
  function normalize() {
    $('#progress-bar').removeClass("red").removeClass("yellow");
    $('#current').removeClass("red-text");
    $('#nav-color').removeClass("red");
    $('#over-capacity').addClass("d-none");
  }

  $('.nav-links a').click(function () {
    $('#nav-drawer').removeClass("bmd-drawer-in");
  });

  $('#cookie-close').click(function () {
    $('#cookie-banner').addClass("d-none");
  });

  if ($("#qrcode").length) {
    var $mylocation = window.mylocation;
    if ($mylocation) {
      new QRCode(document.getElementById("qrcode"), 'https://hackvlc-aforo.pages.dev/room/?i=' + $mylocation);
    } else {
      console.error("No valid location found for QR code");
    }
  }

  if ($("#exqrcode").length) {
    var $mylocation = window.mylocation;
    if ($mylocation) {
      new QRCode(document.getElementById("exqrcode"), 'https://hackvlc-aforo.pages.dev/room/?i=' + $mylocation + '&ex=t');
    } else {
      console.error("No valid location found for QR code");
    }
  }

  // Show the alert
  function showAlert() {
    $('#link-copied').show();
  }

  // Hide the alert
  function hideAlert() {
    $('#link-copied').hide();
  }

  // Bind showAlert to the copy events
  $('#copy, #copy-customer').click(function () {
    var $mylocation = window.mylocation;
    var copyText;

    if (this.id === 'copy') {
      copyText = 'https://hackvlc-aforo.pages.dev/room/?i=' + $mylocation;
    } else if (this.id === 'copy-customer') {
      copyText = 'https://hackvlc-aforo.pages.dev/room/?i=' + $mylocation + '&ex=t';
    }

    navigator.clipboard.writeText(copyText)
        .then(function() {
          showAlert(); // Show alert
        })
        .catch(function(error) {
          console.error('Could not copy text: ', error);
        });
  });

  // Bind hideAlert to the cancel button
  $('#close-alert-btn').click(function () {
    hideAlert(); // Hide alert
  });

  function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  processURL();
});
