var inputEl = document.getElementById('input');
var links = document.querySelector('.links');
var msg = 'Hello! My name\'s Jordan, I\'m a Full Stack Developer.  Check out some of my links above or email me to get in touch!';
var index = 0;

window.onkeypress = function(e) {
  var keyCode = (typeof e.which == "number") ? e.which : e.keyCode;
  if(index == 0){
    inputEl.innerHTML = '<span class="text--grey bold">λ </span>'
  }
  inputEl.innerHTML += msg.slice(index,index+3);
  index+=3;
  /*
  if(keyCode == 13){
    // Enter key:
    inputEl.removeAttribute('id');
    document.querySelector('.cursor').remove();
    var li = document.createElement('li');
    li.innerHTML = '<span id="input" class="text--white"></span><span class="cursor text--white"></span>';
    links.appendChild(li);
    inputEl = document.getElementById('input');
  }else{    
    var key = String.fromCharCode(keyCode);
    inputEl.innerHTML += key;
  }
  */
}