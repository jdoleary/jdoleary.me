var inputEl = document.getElementById('input');
var links = document.querySelector('.links');

window.onkeypress = function(e) {
  var keyCode = (typeof e.which == "number") ? e.which : e.keyCode;
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
}