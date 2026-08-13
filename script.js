// ==========================================
// MEME MAKER PRO v3.0 - ALL FIXES + UPDATES
// ==========================================

var canvas = null;
var ctx = null;
var drawCanvas = null;
var drawCtx = null;
var currentImage = null;
var currentImageData = null;
var textLayers = [];
var stickerLayers = [];
var selectedItemType = null;
var selectedItemIndex = -1;
var drawingMode = false;
var isDrawing = false;
var drawTool = 'pen';
var drawHistory = [];
var drawUndoStack = [];
var currentFilter = 'none';
var exportQuality = 'medium';
var exportFormat = 'png';
var undoStack = [];
var redoStack = [];
var MAX_UNDO = 30;
var currentFont = 'Impact';
var currentTextColor = '#ffffff';
var currentOutlineColor = '#000000';
var currentTextBgColor = 'transparent';
var currentBrushColor = '#ff0000';
var isBold = true;
var isItalic = false;
var isUnderline = false;
var hasShadow = true;
var hasGlow = false;
var isAllCaps = true;
var isDragging = false;
var dragStartX = 0;
var dragStartY = 0;
var dragItemX = 0;
var dragItemY = 0;
var currentZoom = 1;
var minZoom = 0.3;
var maxZoom = 5;
var pinchStartDist = 0;
var pinchStartZoom = 1;
var imageFitMode = 'contain';
var showGrid = false;
var canvasBaseWidth = 0;
var canvasBaseHeight = 0;

// ===== APP START =====
window.addEventListener('load', function() {
  try {
    canvas = document.getElementById('memeCanvas');
    ctx = canvas.getContext('2d');
    initCanvas();
    initColors();
    initStickers();
    initFilters();
    initTemplates();
    initGradients();
    initPinchZoom();
    initCanvasClick();
    storeCanvasBaseSize();
  } catch(err) {
    console.log('Init error:', err);
  }

  setTimeout(function() {
    var splash = document.getElementById('splashScreen');
    var app = document.getElementById('mainApp');
    if (splash) splash.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    try { 
      storeCanvasBaseSize();
      saveState(); 
    } catch(e) {}
  }, 3000);
});

function storeCanvasBaseSize() {
  setTimeout(function() {
    if (canvas) {
      canvasBaseWidth = canvas.offsetWidth || canvas.clientWidth;
      canvasBaseHeight = canvas.offsetHeight || canvas.clientHeight;
    }
  }, 100);
}

function initCanvasClick() {
  var wrapper = document.getElementById('canvasWrapper');
  if (!wrapper) return;
  wrapper.addEventListener('click', function(e) {
    if (e.target === wrapper || e.target === canvas || 
        e.target.id === 'canvasContainer' || e.target.id === 'canvasScaler') {
      deselectAll();
    }
  });
}

// ===== CANVAS =====
function initCanvas() {
  canvas.width = 600;
  canvas.height = 600;
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#636e72';
  ctx.font = '20px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🖼️ Select image or template', canvas.width/2, canvas.height/2 - 10);
  ctx.fillText('to start creating meme', canvas.width/2, canvas.height/2 + 20);
}

// ===== ASPECT RATIO =====
function setCanvasRatio(w, h, btn) {
  saveState();
  var base = 800;
  var newW, newH;
  if (w >= h) { newW = base; newH = Math.round(base * h / w); }
  else { newH = base; newW = Math.round(base * w / h); }
  canvas.width = newW;
  canvas.height = newH;
  if (currentImage) drawImageToCanvas(currentImage);
  else { ctx.fillStyle = '#2d3436'; ctx.fillRect(0, 0, newW, newH); }
  var buttons = document.querySelectorAll('.ratio-btn');
  for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  resetZoom();
  storeCanvasBaseSize();
  renderAllOverlays();
  showToast('📐 Ratio: ' + w + ':' + h);
}

function setCustomPreset(w, h) {
  var wEl = document.getElementById('customWidth');
  var hEl = document.getElementById('customHeight');
  if (wEl) wEl.value = w;
  if (hEl) hEl.value = h;
}

function applyCustomSize() {
  var w = parseInt(document.getElementById('customWidth').value);
  var h = parseInt(document.getElementById('customHeight').value);
  if (!w || !h || w < 100 || h < 100 || w > 2000 || h > 2000) {
    showToast('⚠️ Size 100-2000 hona chahiye');
    return;
  }
  saveState();
  canvas.width = w;
  canvas.height = h;
  if (currentImage) drawImageToCanvas(currentImage);
  else { ctx.fillStyle = '#2d3436'; ctx.fillRect(0, 0, w, h); }
  resetZoom();
  storeCanvasBaseSize();
  renderAllOverlays();
  hidePanel('customSizePanel');
  showToast('✅ Size: ' + w + 'x' + h);
}

// ===== ZOOM - FIXED =====
function initPinchZoom() {
  var wrapper = document.getElementById('canvasWrapper');
  if (!wrapper) return;
  wrapper.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStartDist = getTouchDist(e.touches);
      pinchStartZoom = currentZoom;
    }
  }, { passive: false });
  wrapper.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      var dist = getTouchDist(e.touches);
      var scale = dist / pinchStartDist;
      setZoom(pinchStartZoom * scale);
    }
  }, { passive: false });
}

function getTouchDist(touches) {
  var dx = touches[0].clientX - touches[1].clientX;
  var dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function setZoom(zoom) {
  currentZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
  var scaler = document.getElementById('canvasScaler');
  if (scaler) scaler.style.transform = 'scale(' + currentZoom + ')';
  var indicator = document.getElementById('zoomLevel');
  if (indicator) indicator.textContent = Math.round(currentZoom * 100) + '%';
  // DO NOT call renderAllOverlays here - overlays scale with CSS
}

function zoomIn() {
  setZoom(currentZoom * 1.25);
  showToast('🔍 ' + Math.round(currentZoom * 100) + '%');
}

function zoomOut() {
  setZoom(currentZoom / 1.25);
  showToast('🔍 ' + Math.round(currentZoom * 100) + '%');
}

function resetZoom() {
  setZoom(1);
}

function fitCanvasToScreen() {
  setZoom(1);
}

// ===== UNDO REDO =====
function saveState() {
  if (!canvas || !ctx) return;
  try {
    var state = {
      canvasData: canvas.toDataURL(),
      canvasW: canvas.width,
      canvasH: canvas.height,
      textLayers: JSON.parse(JSON.stringify(textLayers)),
      stickerLayers: JSON.parse(JSON.stringify(stickerLayers)),
      filter: canvas.style.filter || 'none'
    };
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
  } catch(e) {}
}

function undoAction() {
  if (undoStack.length <= 1) { showToast('⚠️ Nothing to undo!'); return; }
  var current = undoStack.pop();
  redoStack.push(current);
  restoreState(undoStack[undoStack.length - 1]);
  showToast('↩️ Undo!');
}

function redoAction() {
  if (redoStack.length === 0) { showToast('⚠️ Nothing to redo!'); return; }
  var state = redoStack.pop();
  undoStack.push(state);
  restoreState(state);
  showToast('↪️ Redo!');
}

function restoreState(state) {
  var img = new Image();
  img.onload = function() {
    canvas.width = state.canvasW;
    canvas.height = state.canvasH;
    ctx.drawImage(img, 0, 0);
    canvas.style.filter = state.filter;
    storeCanvasBaseSize();
    renderAllOverlays();
  };
  img.src = state.canvasData;
  textLayers = JSON.parse(JSON.stringify(state.textLayers));
  stickerLayers = JSON.parse(JSON.stringify(state.stickerLayers));
  deselectAll();
}

// ===== IMAGE =====
function loadImage(event) {
  var file = event.target.files[0];
  if (!file) return;
  saveState();
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      currentImage = img;
      currentImageData = e.target.result;
      var imgRatio = img.width / img.height;
      var base = 800;
      if (imgRatio >= 1) { canvas.width = base; canvas.height = Math.round(base / imgRatio); }
      else { canvas.height = base; canvas.width = Math.round(base * imgRatio); }
      drawImageToCanvas(img);
      resetZoom();
      storeCanvasBaseSize();
      renderAllOverlays();
      hidePanel('imagePanel');
      showToast('✅ Image loaded!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function drawImageToCanvas(img) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (imageFitMode === 'stretch') {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else if (imageFitMode === 'cover') {
    var r1 = canvas.width / canvas.height, r2 = img.width / img.height;
    var w, h, x, y;
    if (r1 > r2) { w = canvas.width; h = w / r2; x = 0; y = (canvas.height - h) / 2; }
    else { h = canvas.height; w = h * r2; x = (canvas.width - w) / 2; y = 0; }
    ctx.drawImage(img, x, y, w, h);
  } else if (imageFitMode === 'center') {
    ctx.drawImage(img, (canvas.width - img.width) / 2, (canvas.height - img.height) / 2);
  } else {
    var r1 = canvas.width / canvas.height, r2 = img.width / img.height;
    var w, h, x, y;
    if (r1 > r2) { h = canvas.height; w = h * r2; x = (canvas.width - w) / 2; y = 0; }
    else { w = canvas.width; h = w / r2; x = 0; y = (canvas.height - h) / 2; }
    ctx.drawImage(img, x, y, w, h);
  }
  if (showGrid) drawGrid();
}

function fitImageCover() { imageFitMode = 'cover'; if (currentImage) { saveState(); drawImageToCanvas(currentImage); showToast('✅ Cover'); } }
function fitImageContain() { imageFitMode = 'contain'; if (currentImage) { saveState(); drawImageToCanvas(currentImage); showToast('✅ Contain'); } }
function fitImageStretch() { imageFitMode = 'stretch'; if (currentImage) { saveState(); drawImageToCanvas(currentImage); showToast('✅ Stretch'); } }
function fitImageCenter() { imageFitMode = 'center'; if (currentImage) { saveState(); drawImageToCanvas(currentImage); showToast('✅ Center'); } }

// ===== BACKGROUND REMOVER =====
function removeBackground() {
  if (!currentImage && !currentImageData) {
    showToast('⚠️ Pehle image select karo!');
    return;
  }
  showToast('⏳ Removing background...');
  
  // Client-side background removal using canvas
  try {
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    var tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    var imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    var data = imageData.data;
    
    // Get corner colors for background detection
    var bgColors = [];
    // Top-left
    bgColors.push({ r: data[0], g: data[1], b: data[2] });
    // Top-right
    var tr = ((tempCanvas.width - 1) * 4);
    bgColors.push({ r: data[tr], g: data[tr+1], b: data[tr+2] });
    // Bottom-left
    var bl = ((tempCanvas.height - 1) * tempCanvas.width * 4);
    bgColors.push({ r: data[bl], g: data[bl+1], b: data[bl+2] });
    // Bottom-right
    var br = (((tempCanvas.height - 1) * tempCanvas.width + tempCanvas.width - 1) * 4);
    bgColors.push({ r: data[br], g: data[br+1], b: data[br+2] });
    
    // Average background color
    var avgR = 0, avgG = 0, avgB = 0;
    bgColors.forEach(function(c) { avgR += c.r; avgG += c.g; avgB += c.b; });
    avgR = Math.round(avgR / 4);
    avgG = Math.round(avgG / 4);
    avgB = Math.round(avgB / 4);
    
    var tolerance = 50;
    
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i+1], b = data[i+2];
      var diffR = Math.abs(r - avgR);
      var diffG = Math.abs(g - avgG);
      var diffB = Math.abs(b - avgB);
      var totalDiff = diffR + diffG + diffB;
      
      if (totalDiff < tolerance) {
        data[i+3] = 0; // Transparent
      } else if (totalDiff < tolerance * 1.5) {
        data[i+3] = Math.round(255 * (totalDiff - tolerance) / (tolerance * 0.5));
      }
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    
    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    showToast('✅ Background removed! (Basic)');
  } catch(e) {
    showToast('❌ Error: ' + e.message);
  }
}

// Advanced BG remove with adjustable tolerance
function removeBackgroundAdvanced(toleranceValue) {
  if (!toleranceValue) toleranceValue = 50;
  showToast('⏳ Processing...');
  
  setTimeout(function() {
    try {
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var data = imageData.data;
      
      // Sample more points for better detection
      var samples = [];
      var w = canvas.width, h = canvas.height;
      var samplePoints = [
        [0,0], [w-1,0], [0,h-1], [w-1,h-1],
        [Math.floor(w/2),0], [0,Math.floor(h/2)],
        [w-1,Math.floor(h/2)], [Math.floor(w/2),h-1],
        [5,5], [w-6,5], [5,h-6], [w-6,h-6]
      ];
      
      samplePoints.forEach(function(p) {
        var idx = (p[1] * w + p[0]) * 4;
        if (idx >= 0 && idx < data.length - 3) {
          samples.push({ r: data[idx], g: data[idx+1], b: data[idx+2] });
        }
      });
      
      // Cluster samples to find dominant bg color
      var avgR = 0, avgG = 0, avgB = 0;
      samples.forEach(function(s) { avgR += s.r; avgG += s.g; avgB += s.b; });
      avgR = Math.round(avgR / samples.length);
      avgG = Math.round(avgG / samples.length);
      avgB = Math.round(avgB / samples.length);
      
      var tol = parseInt(toleranceValue);
      
      for (var i = 0; i < data.length; i += 4) {
        var diff = Math.abs(data[i] - avgR) + Math.abs(data[i+1] - avgG) + Math.abs(data[i+2] - avgB);
        if (diff < tol) {
          data[i+3] = 0;
        } else if (diff < tol * 1.8) {
          var alpha = Math.round(255 * ((diff - tol) / (tol * 0.8)));
          data[i+3] = Math.min(255, alpha);
        }
      }
      
      saveState();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);
      showToast('✅ Background removed!');
    } catch(e) {
      showToast('❌ Error!');
    }
  }, 100);
}

// ===== CANVAS TOOLS =====
function flipCanvasH() {
  saveState();
  var temp = document.createElement('canvas');
  temp.width = canvas.width;
  temp.height = canvas.height;
  var tCtx = temp.getContext('2d');
  tCtx.translate(canvas.width, 0);
  tCtx.scale(-1, 1);
  tCtx.drawImage(canvas, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(temp, 0, 0);
  showToast('↔️ Flipped!');
}

function flipCanvasV() {
  saveState();
  var temp = document.createElement('canvas');
  temp.width = canvas.width;
  temp.height = canvas.height;
  var tCtx = temp.getContext('2d');
  tCtx.translate(0, canvas.height);
  tCtx.scale(1, -1);
  tCtx.drawImage(canvas, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(temp, 0, 0);
  showToast('↕️ Flipped!');
}

function rotateCanvas90() {
  saveState();
  var temp = document.createElement('canvas');
  temp.width = canvas.height;
  temp.height = canvas.width;
  var tCtx = temp.getContext('2d');
  tCtx.translate(temp.width / 2, temp.height / 2);
  tCtx.rotate(90 * Math.PI / 180);
  tCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  canvas.width = temp.width;
  canvas.height = temp.height;
  ctx.drawImage(temp, 0, 0);
  storeCanvasBaseSize();
  renderAllOverlays();
  showToast('🔄 Rotated 90°');
}

function toggleGrid() {
  showGrid = !showGrid;
  if (showGrid) {
    drawGrid();
    showToast('📏 Grid ON');
  } else {
    // Redraw without grid
    if (currentImage) drawImageToCanvas(currentImage);
    showToast('📏 Grid OFF');
  }
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  // Thirds
  for (var i = 1; i <= 2; i++) {
    var x = canvas.width * i / 3;
    var y = canvas.height * i / 3;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  // Center cross
  ctx.strokeStyle = 'rgba(0,206,201,0.4)';
  ctx.beginPath();
  ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2);
  ctx.stroke();
  ctx.restore();
}

function resetCanvas() {
  if (!confirm('Sab clear karna hai? Text, stickers sab delete ho jayenge!')) return;
  saveState();
  textLayers = [];
  stickerLayers = [];
  currentImage = null;
  currentImageData = null;
  canvas.width = 600;
  canvas.height = 600;
  initCanvas();
  resetZoom();
  storeCanvasBaseSize();
  deselectAll();
  renderAllOverlays();
  updateLayersList();
  showToast('🔄 Canvas reset!');
}

// ===== TEMPLATES =====
function initTemplates() {
  var templates = [
    { emoji: '😂', bg: '#ff6b6b' }, { emoji: '🤔', bg: '#ffd93d' },
    { emoji: '😡', bg: '#ee5a24' }, { emoji: '😭', bg: '#74b9ff' },
    { emoji: '🥺', bg: '#a29bfe' }, { emoji: '💀', bg: '#2d3436' },
    { emoji: '🔥', bg: '#e17055' }, { emoji: '👑', bg: '#fdcb6e' },
    { emoji: '🤡', bg: '#fd79a8' }, { emoji: '😎', bg: '#00cec9' },
    { emoji: '🗿', bg: '#636e72' }, { emoji: '💯', bg: '#d63031' },
    { emoji: '🧠', bg: '#6c5ce7' }, { emoji: '😤', bg: '#e84393' },
    { emoji: '🫡', bg: '#0984e3' }, { emoji: '💪', bg: '#00b894' }
  ];
  var grid = document.getElementById('templatesGrid');
  if (!grid) return;
  templates.forEach(function(t) {
    var div = document.createElement('div');
    div.className = 'template-item';
    div.style.background = t.bg;
    div.textContent = t.emoji;
    div.onclick = function() { saveState(); loadTemplate(t); };
    grid.appendChild(div);
  });
}

function loadTemplate(t) {
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = (canvas.width * 0.25) + 'px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t.emoji, canvas.width/2, canvas.height/2);
  currentImage = null;
  hidePanel('imagePanel');
  showToast('✅ Template!');
}

// ===== GRADIENTS =====
function initGradients() {
  var gradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #fccb90, #d57eeb)',
    'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
    'linear-gradient(135deg, #ff9a9e, #fad0c4)',
    'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
    'linear-gradient(135deg, #2d3436, #636e72)',
    'linear-gradient(135deg, #fd79a8, #6c5ce7)'
  ];
  var grid = document.getElementById('gradientGrid');
  if (!grid) return;
  gradients.forEach(function(g) {
    var div = document.createElement('div');
    div.className = 'gradient-item';
    div.style.background = g;
    div.onclick = function() { saveState(); applyGradientBg(g); };
    grid.appendChild(div);
  });
}

function applyGradientBg(gradient) {
  var colors = gradient.match(/#[a-fA-F0-9]{6}/g);
  if (colors && colors.length >= 2) {
    var grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, colors[0]); grd.addColorStop(1, colors[1]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  currentImage = null; hidePanel('bgColorPanel');
  showToast('✅ Background!');
}

function applyBgColor(color) {
  saveState(); ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  currentImage = null; hidePanel('bgColorPanel');
  showToast('✅ Background!');
}

function applyCustomBgColor() {
  applyBgColor(document.getElementById('customBgColor').value);
}

// ===== COLORS =====
function initColors() {
  var colors = [
    '#ffffff','#000000','#ff6b6b','#ee5a24','#ffd93d','#51cf66','#74b9ff','#6c5ce7',
    '#fd79a8','#00cec9','#e17055','#636e72','#d63031','#0984e3','#a29bfe','#fdcb6e',
    '#00b894','#e84393','#fab1a0','#55efc4','#81ecec','#dfe6e9','#b2bec3','#2d3436'
  ];
  var grids = ['textColorGrid','outlineColorGrid','brushColorGrid','bgColorGrid','textBgColorGrid'];
  grids.forEach(function(gid) {
    var g = document.getElementById(gid);
    if (!g) return;
    colors.forEach(function(c) {
      var d = document.createElement('div');
      d.className = 'color-item'; d.style.background = c;
      d.onclick = function() { handleColorSelect(gid, c, d); };
      g.appendChild(d);
    });
  });
}

function handleColorSelect(gid, color, el) {
  var g = document.getElementById(gid);
  if (!g) return;
  var items = g.querySelectorAll('.color-item');
  for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
  el.classList.add('active');
  if (gid === 'textColorGrid') { currentTextColor = color; updateSelectedText(); }
  else if (gid === 'outlineColorGrid') { currentOutlineColor = color; updateSelectedText(); }
  else if (gid === 'brushColorGrid') { currentBrushColor = color; if (drawCtx) drawCtx.strokeStyle = color; }
  else if (gid === 'bgColorGrid') applyBgColor(color);
  else if (gid === 'textBgColorGrid') { currentTextBgColor = color; updateSelectedText(); }
}

function applyCustomTextColor() { currentTextColor = document.getElementById('customTextColor').value; updateSelectedText(); }
function applyCustomBrushColor() { currentBrushColor = document.getElementById('customBrushColor').value; if (drawCtx) drawCtx.strokeStyle = currentBrushColor; }
function clearTextBg() { currentTextBgColor = 'transparent'; updateSelectedText(); showToast('🚫 Removed'); }

// ===== TEXT =====
function addTextLayer() {
  var input = document.getElementById('textInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text) { showToast('⚠️ Text likho!'); return; }
  saveState();
  if (isAllCaps) text = text.toUpperCase();
  var layer = {
    text: text,
    x: canvas.width * 0.1,
    y: canvas.height * 0.15 + textLayers.length * 60,
    fontSize: Math.round(canvas.width * 0.06),
    fontFamily: 'Impact', color: '#ffffff',
    outlineColor: '#000000', outlineWidth: 2,
    bgColor: 'transparent',
    bold: true, italic: false, underline: false,
    shadow: true, glow: false, allCaps: true,
    opacity: 1, rotation: 0, align: 'center',
    lineHeight: 120, letterSpacing: 0
  };
  textLayers.push(layer);
  input.value = '';
  renderAllOverlays();
  updateLayersList();
  hidePanel('textPanel');
  selectItemNoPanel('text', textLayers.length - 1);
  showToast('✅ Text added!');
}

function addQuickText(text) {
  var input = document.getElementById('textInput');
  if (input) input.value = text;
  addTextLayer();
}

function updateLayersList() {
  var list = document.getElementById('textLayersList');
  if (!list) return;
  list.innerHTML = '';
  textLayers.forEach(function(layer, i) {
    var div = document.createElement('div');
    div.className = 'layer-item';
    if (selectedItemType === 'text' && selectedItemIndex === i) div.classList.add('active');
    div.innerHTML = '<div class="layer-text">📝 ' + layer.text.substring(0, 25) + '</div>' +
      '<div class="layer-actions">' +
      '<button class="layer-action-btn" onclick="event.stopPropagation();selectItem(\'text\',' + i + ')">✏️</button>' +
      '<button class="layer-action-btn" onclick="event.stopPropagation();deleteLayerAt(\'text\',' + i + ')">🗑️</button></div>';
    div.onclick = function() { hidePanel('textPanel'); selectItemNoPanel('text', i); };
    list.appendChild(div);
  });
}

function deleteLayerAt(type, index) {
  saveState();
  if (type === 'text') textLayers.splice(index, 1);
  else stickerLayers.splice(index, 1);
  deselectAll(); renderAllOverlays(); updateLayersList();
  showToast('🗑️ Deleted!');
}

// ===== RENDER OVERLAYS - ZOOM FIXED =====
function getOverlayScale() {
  // Use the actual rendered size of canvas element (without zoom transform)
  // canvas.offsetWidth gives CSS width before transform
  var w = canvas.offsetWidth || canvas.clientWidth || canvas.width;
  var h = canvas.offsetHeight || canvas.clientHeight || canvas.height;
  return {
    x: w / canvas.width,
    y: h / canvas.height
  };
}

function renderAllOverlays() {
  var container = document.getElementById('overlayContainer');
  if (!container || !canvas) return;
  container.innerHTML = '';
  
  var scale = getOverlayScale();
  if (scale.x === 0) return;

  for (var i = 0; i < textLayers.length; i++) {
    createTextOverlay(container, textLayers[i], i, scale.x, scale.y);
  }
  for (var j = 0; j < stickerLayers.length; j++) {
    createStickerOverlay(container, stickerLayers[j], j, scale.x, scale.y);
  }
}

function createTextOverlay(container, layer, index, scaleX, scaleY) {
  var div = document.createElement('div');
  div.className = 'overlay-item text-overlay-item';
  if (selectedItemType === 'text' && selectedItemIndex === index) div.classList.add('selected');

  div.style.left = (layer.x * scaleX) + 'px';
  div.style.top = (layer.y * scaleY) + 'px';
  div.style.fontSize = (layer.fontSize * scaleX) + 'px';
  div.style.fontFamily = layer.fontFamily;
  div.style.color = layer.color;
  div.style.fontWeight = layer.bold ? 'bold' : 'normal';
  div.style.fontStyle = layer.italic ? 'italic' : 'normal';
  div.style.textDecoration = layer.underline ? 'underline' : 'none';
  div.style.opacity = layer.opacity;
  div.style.transform = 'rotate(' + layer.rotation + 'deg)';
  div.style.textAlign = layer.align;
  div.style.lineHeight = (layer.lineHeight || 120) + '%';
  div.style.letterSpacing = (layer.letterSpacing || 0) + 'px';

  if (layer.bgColor && layer.bgColor !== 'transparent') {
    div.style.background = layer.bgColor;
    div.style.padding = '5px 12px'; div.style.borderRadius = '6px';
  }
  if (layer.outlineWidth > 0) div.style.webkitTextStroke = (layer.outlineWidth * scaleX) + 'px ' + layer.outlineColor;
  var shadows = [];
  if (layer.shadow) shadows.push('2px 2px 4px rgba(0,0,0,0.8)');
  if (layer.glow) shadows.push('0 0 15px ' + layer.color + ', 0 0 25px ' + layer.color);
  if (shadows.length) div.style.textShadow = shadows.join(', ');
  div.textContent = layer.text;

  var rh = document.createElement('div');
  rh.className = 'resize-handle';
  div.appendChild(rh);

  var idx = index;
  
  // Double tap to edit
  var lastTap = 0;
  div.addEventListener('pointerdown', function(e) {
    e.stopPropagation();
    var now = Date.now();
    if (e.target === rh) { startResize(e, 'text', idx); return; }
    
    if (now - lastTap < 300) {
      // Double tap - open edit
      selectItem('text', idx);
      return;
    }
    lastTap = now;
    
    if (selectedItemType !== 'text' || selectedItemIndex !== idx) {
      selectItemNoPanel('text', idx);
    }
    startDrag(e, 'text', idx);
  });

  container.appendChild(div);
}

function createStickerOverlay(container, sticker, index, scaleX, scaleY) {
  var div = document.createElement('div');
  div.className = 'overlay-item sticker-overlay-item';
  if (selectedItemType === 'sticker' && selectedItemIndex === index) div.classList.add('selected');

  div.style.left = (sticker.x * scaleX) + 'px';
  div.style.top = (sticker.y * scaleY) + 'px';
  div.style.fontSize = (sticker.size * scaleX) + 'px';
  div.style.opacity = (sticker.opacity || 100) / 100;
  var transform = 'rotate(' + (sticker.rotation || 0) + 'deg)';
  if (sticker.flipH) transform += ' scaleX(-1)';
  if (sticker.flipV) transform += ' scaleY(-1)';
  div.style.transform = transform;
  div.textContent = sticker.emoji;

  var rh = document.createElement('div');
  rh.className = 'resize-handle';
  div.appendChild(rh);

  var idx = index;
  var lastTap = 0;
  div.addEventListener('pointerdown', function(e) {
    e.stopPropagation();
    var now = Date.now();
    if (e.target === rh) { startResize(e, 'sticker', idx); return; }
    if (now - lastTap < 300) { selectItem('sticker', idx); return; }
    lastTap = now;
    if (selectedItemType !== 'sticker' || selectedItemIndex !== idx) selectItemNoPanel('sticker', idx);
    startDrag(e, 'sticker', idx);
  });

  container.appendChild(div);
}

// ===== SELECTION =====
function selectItemNoPanel(type, index) {
  selectedItemType = type; selectedItemIndex = index;
  renderAllOverlays();
  var panels = document.querySelectorAll('.panel');
  for (var i = 0; i < panels.length; i++) panels[i].classList.add('hidden');
  hideMainToolbar(); showSelectionBar();
}

function selectItem(type, index) {
  selectedItemType = type; selectedItemIndex = index;
  renderAllOverlays(); hideMainToolbar(); showSelectionBar();
  if (type === 'text') openTextEditPanel(index);
  else if (type === 'sticker') openStickerEditPanel(index);
}

function deselectAll() {
  selectedItemType = null; selectedItemIndex = -1;
  renderAllOverlays(); hideSelectionBar(); showMainToolbar();
  hidePanel('textEditPanel'); hidePanel('stickerEditPanel');
}

function showSelectionBar() { var e = document.getElementById('selectionBar'); if (e) e.classList.remove('hidden'); }
function hideSelectionBar() { var e = document.getElementById('selectionBar'); if (e) e.classList.add('hidden'); }
function showMainToolbar() { var e = document.getElementById('mainToolbar'); if (e) e.classList.remove('hidden'); }
function hideMainToolbar() { var e = document.getElementById('mainToolbar'); if (e) e.classList.add('hidden'); }
function openEditPanel() {
  if (selectedItemType === 'text') openTextEditPanel(selectedItemIndex);
  else if (selectedItemType === 'sticker') openStickerEditPanel(selectedItemIndex);
}

// ===== EDIT PANELS =====
function openTextEditPanel(index) {
  if (index < 0 || index >= textLayers.length) return;
  var l = textLayers[index];
  hidePanel('stickerEditPanel');
  setVal('editTextInput', l.text);
  setVal('fontSizeSlider', l.fontSize); setText('fontSizeValue', l.fontSize + 'px');
  setVal('outlineSlider', l.outlineWidth); setText('outlineValue', l.outlineWidth + 'px');
  setVal('opacitySlider', l.opacity * 100); setText('opacityValue', Math.round(l.opacity * 100) + '%');
  setVal('rotationSlider', l.rotation); setText('rotationValue', l.rotation + '°');
  setVal('lineHeightSlider', l.lineHeight || 120); setText('lineHeightValue', (l.lineHeight || 120) + '%');
  setVal('letterSpacingSlider', l.letterSpacing || 0); setText('letterSpacingValue', (l.letterSpacing || 0) + 'px');
  currentTextColor = l.color; currentOutlineColor = l.outlineColor;
  currentTextBgColor = l.bgColor || 'transparent'; currentFont = l.fontFamily;
  isBold = l.bold; isItalic = l.italic; isUnderline = l.underline || false;
  hasShadow = l.shadow; hasGlow = l.glow || false; isAllCaps = l.allCaps;
  updateStyleButtons();
  showPanel('textEditPanel');
}

function openStickerEditPanel(index) {
  if (index < 0 || index >= stickerLayers.length) return;
  var s = stickerLayers[index];
  hidePanel('textEditPanel');
  setVal('stickerSizeSlider', s.size); setText('stickerSizeValue', s.size + 'px');
  setVal('stickerRotationSlider', s.rotation || 0); setText('stickerRotationValue', (s.rotation || 0) + '°');
  setVal('stickerOpacitySlider', s.opacity || 100); setText('stickerOpacityValue', (s.opacity || 100) + '%');
  showPanel('stickerEditPanel');
}

function setVal(id, v) { var e = document.getElementById(id); if (e) e.value = v; }
function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
function getVal(id, d) { var e = document.getElementById(id); return e ? e.value : d; }

function updateTextContent() {
  if (selectedItemType !== 'text' || selectedItemIndex < 0) return;
  saveState();
  var input = document.getElementById('editTextInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text) { showToast('⚠️ Empty!'); return; }
  if (textLayers[selectedItemIndex].allCaps) text = text.toUpperCase();
  textLayers[selectedItemIndex].text = text;
  renderAllOverlays(); updateLayersList();
  showToast('✅ Updated!');
}

function updateStyleButtons() {
  var btns = ['boldBtn','italicBtn','underlineBtn','shadowBtn','allCapsBtn','glowBtn'];
  var states = [isBold, isItalic, isUnderline, hasShadow, isAllCaps, hasGlow];
  btns.forEach(function(id, i) { var e = document.getElementById(id); if (e) e.classList.toggle('active', states[i]); });
}

function updateSelectedText() {
  if (selectedItemType !== 'text' || selectedItemIndex < 0 || selectedItemIndex >= textLayers.length) return;
  var l = textLayers[selectedItemIndex];
  l.fontSize = parseInt(getVal('fontSizeSlider', 32));
  l.outlineWidth = parseInt(getVal('outlineSlider', 2));
  l.opacity = parseInt(getVal('opacitySlider', 100)) / 100;
  l.rotation = parseInt(getVal('rotationSlider', 0));
  l.lineHeight = parseInt(getVal('lineHeightSlider', 120));
  l.letterSpacing = parseInt(getVal('letterSpacingSlider', 0));
  l.color = currentTextColor; l.outlineColor = currentOutlineColor;
  l.bgColor = currentTextBgColor; l.fontFamily = currentFont;
  l.bold = isBold; l.italic = isItalic; l.underline = isUnderline;
  l.shadow = hasShadow; l.glow = hasGlow; l.allCaps = isAllCaps;
  if (l.allCaps) l.text = l.text.toUpperCase();
  setText('fontSizeValue', l.fontSize + 'px');
  setText('outlineValue', l.outlineWidth + 'px');
  setText('opacityValue', Math.round(l.opacity * 100) + '%');
  setText('rotationValue', l.rotation + '°');
  setText('lineHeightValue', l.lineHeight + '%');
  setText('letterSpacingValue', l.letterSpacing + 'px');
  renderAllOverlays();
}

function updateSelectedSticker() {
  if (selectedItemType !== 'sticker' || selectedItemIndex < 0 || selectedItemIndex >= stickerLayers.length) return;
  var s = stickerLayers[selectedItemIndex];
  s.size = parseInt(getVal('stickerSizeSlider', 50));
  s.rotation = parseInt(getVal('stickerRotationSlider', 0));
  s.opacity = parseInt(getVal('stickerOpacitySlider', 100));
  setText('stickerSizeValue', s.size + 'px');
  setText('stickerRotationValue', s.rotation + '°');
  setText('stickerOpacityValue', s.opacity + '%');
  renderAllOverlays();
}

function changeFont(f, btn) {
  currentFont = f;
  var btns = document.querySelectorAll('.font-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  updateSelectedText();
}

function toggleBold() { isBold = !isBold; var e = document.getElementById('boldBtn'); if(e) e.classList.toggle('active'); updateSelectedText(); }
function toggleItalic() { isItalic = !isItalic; var e = document.getElementById('italicBtn'); if(e) e.classList.toggle('active'); updateSelectedText(); }
function toggleUnderline() { isUnderline = !isUnderline; var e = document.getElementById('underlineBtn'); if(e) e.classList.toggle('active'); updateSelectedText(); }
function toggleShadow() { hasShadow = !hasShadow; var e = document.getElementById('shadowBtn'); if(e) e.classList.toggle('active'); updateSelectedText(); }
function toggleGlow() { hasGlow = !hasGlow; var e = document.getElementById('glowBtn'); if(e) e.classList.toggle('active'); updateSelectedText(); }
function toggleCaps() { isAllCaps = !isAllCaps; var e = document.getElementById('allCapsBtn'); if(e) e.classList.toggle('active'); updateSelectedText(); }
function changeAlign(a) { if (selectedItemType !== 'text' || selectedItemIndex < 0) return; textLayers[selectedItemIndex].align = a; renderAllOverlays(); }
function flipSticker(d) { if (selectedItemType !== 'sticker' || selectedItemIndex < 0) return; if (d==='h') stickerLayers[selectedItemIndex].flipH = !stickerLayers[selectedItemIndex].flipH; if (d==='v') stickerLayers[selectedItemIndex].flipV = !stickerLayers[selectedItemIndex].flipV; renderAllOverlays(); }

// ===== SELECTION BAR =====
function duplicateSelectedItem() {
  saveState();
  if (selectedItemType === 'text' && selectedItemIndex >= 0) {
    var c = JSON.parse(JSON.stringify(textLayers[selectedItemIndex]));
    c.x += 20; c.y += 20; textLayers.push(c);
    selectItemNoPanel('text', textLayers.length - 1);
    showToast('📋 Copied!');
  } else if (selectedItemType === 'sticker' && selectedItemIndex >= 0) {
    var s = JSON.parse(JSON.stringify(stickerLayers[selectedItemIndex]));
    s.x += 20; s.y += 20; stickerLayers.push(s);
    selectItemNoPanel('sticker', stickerLayers.length - 1);
    showToast('📋 Copied!');
  }
}

function moveLayerUp() {
  var arr = selectedItemType === 'text' ? textLayers : stickerLayers;
  if (selectedItemIndex < arr.length - 1) {
    var t = arr[selectedItemIndex]; arr[selectedItemIndex] = arr[selectedItemIndex + 1]; arr[selectedItemIndex + 1] = t;
    selectedItemIndex++; renderAllOverlays(); showToast('⬆️ Up!');
  }
}
function moveLayerDown() {
  var arr = selectedItemType === 'text' ? textLayers : stickerLayers;
  if (selectedItemIndex > 0) {
    var t = arr[selectedItemIndex]; arr[selectedItemIndex] = arr[selectedItemIndex - 1]; arr[selectedItemIndex - 1] = t;
    selectedItemIndex--; renderAllOverlays(); showToast('⬇️ Down!');
  }
}
function deleteSelectedItem() {
  if (selectedItemType === 'text' && selectedItemIndex >= 0) {
    saveState(); textLayers.splice(selectedItemIndex, 1); deselectAll(); renderAllOverlays(); updateLayersList(); showToast('🗑️ Deleted!');
  } else if (selectedItemType === 'sticker' && selectedItemIndex >= 0) {
    saveState(); stickerLayers.splice(selectedItemIndex, 1); deselectAll(); renderAllOverlays(); showToast('🗑️ Deleted!');
  } else showToast('⚠️ Select first!');
}

// ===== DRAG - ZOOM FIXED =====
function startDrag(e, type, index) {
  e.preventDefault();
  isDragging = true;
  
  // Use getBoundingClientRect which includes zoom transform
  var rect = canvas.getBoundingClientRect();
  var sX = rect.width / canvas.width;
  var sY = rect.height / canvas.height;
  
  dragStartX = e.clientX; dragStartY = e.clientY;
  if (type === 'text') { dragItemX = textLayers[index].x; dragItemY = textLayers[index].y; }
  else { dragItemX = stickerLayers[index].x; dragItemY = stickerLayers[index].y; }

  var dType = type, dIdx = index, moved = false;
  var startSX = sX, startSY = sY;

  function mv(e2) {
    if (!isDragging) return;
    e2.preventDefault();
    var dx = e2.clientX - dragStartX;
    var dy = e2.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
    
    // Convert screen pixels to canvas pixels using current zoom scale
    var r = canvas.getBoundingClientRect();
    var curSX = r.width / canvas.width;
    var curSY = r.height / canvas.height;
    
    if (dType === 'text') {
      textLayers[dIdx].x = dragItemX + dx / curSX;
      textLayers[dIdx].y = dragItemY + dy / curSY;
    } else {
      stickerLayers[dIdx].x = dragItemX + dx / curSX;
      stickerLayers[dIdx].y = dragItemY + dy / curSY;
    }
    renderAllOverlays();
  }
  function end() {
    if (isDragging && moved) { try { saveState(); } catch(e) {} }
    isDragging = false;
    document.removeEventListener('pointermove', mv);
    document.removeEventListener('pointerup', end);
    document.removeEventListener('pointercancel', end);
  }
  document.addEventListener('pointermove', mv);
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
}

function startResize(e, type, index) {
  e.preventDefault(); e.stopPropagation();
  var startX = e.clientX, startY = e.clientY;
  var startSize = type === 'text' ? textLayers[index].fontSize : stickerLayers[index].size;
  var rType = type, rIdx = index;
  function mv(e2) {
    var dx = e2.clientX - startX, dy = e2.clientY - startY;
    var delta = (dx + dy) / (2 * currentZoom); // Account for zoom
    var ns = Math.max(8, Math.round(startSize + delta));
    if (rType === 'text') { textLayers[rIdx].fontSize = ns; setVal('fontSizeSlider', ns); setText('fontSizeValue', ns + 'px'); }
    else { stickerLayers[rIdx].size = ns; setVal('stickerSizeSlider', ns); setText('stickerSizeValue', ns + 'px'); }
    renderAllOverlays();
  }
  function end() { try { saveState(); } catch(e) {} document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', end); }
  document.addEventListener('pointermove', mv);
  document.addEventListener('pointerup', end);
}

// ===== STICKERS =====
var allStickers = [];
function initStickers() {
  var emojiList = ['😂','🤣','😭','😍','🥺','😎','🤔','😡','🙄','😱','🤡','💀','😴','🤮','🥴','😈','👽','🤖','💩','🤠','😳','🫣','🥶','🤑','😏','🫠','🤯','🥳','😇','🤗'];
  var gestureList = ['👍','👎','👏','🤝','✌️','🤞','🤙','👆','👇','👈','👉','💪','🙏','🫡','✋','👋','🤘','🫶','👊','🤛'];
  var symbolList = ['❤️','💔','💕','💖','⭐','🌟','✨','💫','🔥','💯','✅','❌','⚠️','💬','💭','🏆','💎','🎯'];
  var partyList = ['🎉','🎊','🎈','🎁','🎂','🍾','🥂','🎯','🎪','🎭','🎤','🎶','🎵','🎺','🥁','🎸'];
  var animalList = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🦄','🐝'];
  var foodList = ['🍕','🍔','🍟','🌭','🍿','🧀','🍩','🍪','🍰','🎂','🍫','🍬','🍭','☕','🍵','🥤','🍺','🧃'];
  var objectList = ['📱','💻','⌚','📷','🎮','🎧','💡','🔑','💰','📚','✏️','🎒','👓','🧲','🔔','📌'];
  var travelList = ['🚗','🚕','🏎️','🚌','✈️','🚀','🛸','🚁','⛵','🏠','🏰','🗼','🌍','🗽','⛰️','🏖️'];
  var sportsList = ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🥋','⛳','🎣','🏹','🎿'];
  var weatherList = ['☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','🌪️','🌈','🌊','💨'];
  var numberList = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','#️⃣','*️⃣','0️⃣','🅰️','🅱️','🆗'];

  populateStickers('emojiGrid', emojiList); populateStickers('gestureGrid', gestureList);
  populateStickers('symbolGrid', symbolList); populateStickers('partyGrid', partyList);
  populateStickers('animalGrid', animalList); populateStickers('foodGrid', foodList);
  populateStickers('objectGrid', objectList); populateStickers('travelGrid', travelList);
  populateStickers('sportsGrid', sportsList); populateStickers('weatherGrid', weatherList);
  populateStickers('numberGrid', numberList);
  allStickers = [].concat(emojiList,gestureList,symbolList,partyList,animalList,foodList,objectList,travelList,sportsList,weatherList,numberList);
}

function populateStickers(gid, arr) {
  var g = document.getElementById(gid); if (!g) return;
  arr.forEach(function(s) {
    var d = document.createElement('div'); d.className = 'sticker-item'; d.textContent = s;
    d.onclick = function() { addSticker(s); };
    g.appendChild(d);
  });
}

function searchStickers() {
  var q = document.getElementById('stickerSearch').value.trim();
  var res = document.getElementById('stickerResults');
  if (!res) return; res.innerHTML = '';
  if (!q) return;
  var html = '<div class="sticker-grid">';
  allStickers.slice(0,28).forEach(function(s) { html += '<div class="sticker-item" onclick="addSticker(\'' + s + '\')">' + s + '</div>'; });
  html += '</div>';
  res.innerHTML = html;
}

function addSticker(emoji) {
  saveState();
  stickerLayers.push({
    emoji: emoji, x: canvas.width*0.4+Math.random()*50, y: canvas.height*0.4+Math.random()*50,
    size: Math.round(canvas.width*0.1), rotation: 0, opacity: 100, flipH: false, flipV: false
  });
  hidePanel('stickerPanel');
  renderAllOverlays();
  selectItemNoPanel('sticker', stickerLayers.length - 1);
  showToast('✅ Sticker!');
}

// ===== DRAWING =====
function toggleDrawMode() {
  drawingMode = !drawingMode;
  var btn = document.getElementById('toggleDrawBtn');
  if (drawingMode) {
    if (btn) { btn.textContent = '🛑 Stop'; btn.classList.add('active'); }
    createDrawCanvas(); deselectAll(); hidePanel('drawPanel');
    showToast('🖌️ Drawing ON!');
  } else {
    if (btn) { btn.textContent = '🖌️ Start Drawing'; btn.classList.remove('active'); }
    removeDrawCanvas(); showToast('✅ Drawing OFF!');
  }
}

function createDrawCanvas() {
  if (drawCanvas) return;
  drawCanvas = document.createElement('canvas'); drawCanvas.id = 'drawCanvas';
  drawCanvas.width = canvas.width; drawCanvas.height = canvas.height;
  drawCanvas.style.width = '100%'; drawCanvas.style.height = '100%';
  var c = document.getElementById('canvasContainer'); if (c) c.appendChild(drawCanvas);
  drawCtx = drawCanvas.getContext('2d');
  drawCtx.lineCap = 'round'; drawCtx.lineJoin = 'round';
  drawCtx.strokeStyle = currentBrushColor; drawCtx.lineWidth = parseInt(getVal('brushSize', 3));
  drawCanvas.addEventListener('pointerdown', startDraw);
  drawCanvas.addEventListener('pointermove', drawMove);
  drawCanvas.addEventListener('pointerup', endDraw);
}

function removeDrawCanvas() {
  if (drawCanvas) { drawHistory.push(drawCanvas.toDataURL()); drawCanvas.remove(); drawCanvas = null; drawCtx = null; }
}

function startDraw(e) {
  e.preventDefault(); isDrawing = true;
  var pos = getDrawPos(e);
  drawCtx.beginPath(); drawCtx.moveTo(pos.x, pos.y);
  if (drawCanvas) drawUndoStack.push(drawCanvas.toDataURL());
}

function drawMove(e) {
  if (!isDrawing || !drawCtx) return; e.preventDefault();
  var pos = getDrawPos(e);
  drawCtx.globalCompositeOperation = drawTool === 'eraser' ? 'destination-out' : 'source-over';
  drawCtx.globalAlpha = parseInt(getVal('brushOpacity', 100)) / 100;
  drawCtx.lineTo(pos.x, pos.y); drawCtx.stroke();
}

function endDraw() {
  isDrawing = false;
  if (drawCtx) { drawCtx.closePath(); drawCtx.globalCompositeOperation = 'source-over'; drawCtx.globalAlpha = 1; }
}

function getDrawPos(e) {
  var r = drawCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (drawCanvas.width / r.width), y: (e.clientY - r.top) * (drawCanvas.height / r.height) };
}

function setDrawTool(t) {
  drawTool = t;
  var p = document.getElementById('penTool'), er = document.getElementById('eraserTool');
  if (p) p.classList.toggle('active', t === 'pen');
  if (er) er.classList.toggle('active', t === 'eraser');
}

function updateBrushSize() { setText('brushSizeValue', getVal('brushSize', 3) + 'px'); if (drawCtx) drawCtx.lineWidth = parseInt(getVal('brushSize', 3)); }
function updateBrushOpacity() { setText('brushOpacityValue', getVal('brushOpacity', 100) + '%'); }

function undoDrawing() {
  if (drawUndoStack.length > 0 && drawCtx && drawCanvas) {
    var prev = drawUndoStack.pop(); var img = new Image();
    img.onload = function() { drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); drawCtx.drawImage(img, 0, 0); };
    img.src = prev; showToast('↩️ Undo!');
  }
}
function clearDrawing() {
  if (drawCtx && drawCanvas) drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawHistory = []; drawUndoStack = []; showToast('🗑️ Cleared!');
}

// ===== FILTERS =====
function initFilters() {
  var filters = [
    {name:'Normal',value:'none'},{name:'Grayscale',value:'grayscale(100%)'},{name:'Sepia',value:'sepia(100%)'},
    {name:'Vintage',value:'sepia(50%) contrast(120%)'},{name:'Bright',value:'brightness(130%)'},{name:'Dark',value:'brightness(70%)'},
    {name:'Contrast',value:'contrast(150%)'},{name:'Saturate',value:'saturate(200%)'},{name:'Invert',value:'invert(100%)'},
    {name:'Warm',value:'sepia(30%) saturate(140%)'},{name:'Cool',value:'hue-rotate(180deg) saturate(80%)'},{name:'Retro',value:'sepia(60%) brightness(90%) contrast(120%)'}
  ];
  var g = document.getElementById('filterGrid'); if (!g) return;
  filters.forEach(function(f) {
    var d = document.createElement('div'); d.className = 'filter-item';
    if (f.value === 'none') d.classList.add('active');
    d.textContent = f.name;
    d.onclick = function() {
      canvas.style.filter = f.value;
      var items = g.querySelectorAll('.filter-item');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
      d.classList.add('active'); showToast('🎨 ' + f.name);
    };
    g.appendChild(d);
  });
}

function applyAdjustments() {
  var b=getVal('brightnessSlider',100),c=getVal('contrastSlider',100),s=getVal('saturationSlider',100),bl=getVal('blurSlider',0),h=getVal('hueSlider',0),sp=getVal('sepiaSlider',0);
  setText('brightnessValue',b+'%');setText('contrastValue',c+'%');setText('saturationValue',s+'%');setText('blurValue',bl+'px');setText('hueValue',h+'°');setText('sepiaValue',sp+'%');
  canvas.style.filter='brightness('+b+'%) contrast('+c+'%) saturate('+s+'%) blur('+bl+'px) hue-rotate('+h+'deg) sepia('+sp+'%)';
}

function resetFilters() {
  setVal('brightnessSlider',100);setVal('contrastSlider',100);setVal('saturationSlider',100);setVal('blurSlider',0);setVal('hueSlider',0);setVal('sepiaSlider',0);
  canvas.style.filter='none';
  var items=document.querySelectorAll('.filter-item');for(var i=0;i<items.length;i++) items[i].classList.toggle('active',i===0);
  applyAdjustments(); showToast('🔄 Reset!');
}

// ===== EXPORT =====
function setQuality(q,btn) { exportQuality=q; var b=document.querySelectorAll('.quality-btn'); for(var i=0;i<b.length;i++) b[i].classList.remove('active'); if(btn) btn.classList.add('active'); }
function setFormat(f,btn) { exportFormat=f; var b=document.querySelectorAll('.format-btn'); for(var i=0;i<b.length;i++) b[i].classList.remove('active'); if(btn) btn.classList.add('active'); }

function downloadMeme() {
  showToast('⏳ Creating...');
  setTimeout(function() {
    try {
      var fc=createFinalCanvas(); var mime='image/png',ext='png';
      if(exportFormat==='jpeg'){mime='image/jpeg';ext='jpg';}
      if(exportFormat==='webp'){mime='image/webp';ext='webp';}
      var link=document.createElement('a'); link.download='meme_'+Date.now()+'.'+ext;
      link.href=fc.toDataURL(mime,0.95); link.click(); showToast('✅ Downloaded!');
    } catch(e) { showToast('❌ Error!'); }
  }, 500);
}

function shareMeme() {
  showToast('⏳ Preparing...');
  setTimeout(function() {
    try {
      var fc=createFinalCanvas();
      fc.toBlob(function(blob) {
        if(navigator.share&&blob) {
          var file=new File([blob],'meme.png',{type:'image/png'});
          navigator.share({title:'Meme',files:[file]}).then(function(){showToast('✅ Shared!');}).catch(function(){downloadMeme();});
        } else downloadMeme();
      },'image/png');
    } catch(e) { downloadMeme(); }
  }, 500);
}

function createFinalCanvas() {
  var scale=1;
  if(exportQuality==='low')scale=480/canvas.width;if(exportQuality==='medium')scale=720/canvas.width;
  if(exportQuality==='high')scale=1080/canvas.width;if(exportQuality==='ultra')scale=1440/canvas.width;
  var fc=document.createElement('canvas');fc.width=canvas.width*scale;fc.height=canvas.height*scale;
  var f=fc.getContext('2d');
  if(canvas.style.filter&&canvas.style.filter!=='none')f.filter=canvas.style.filter;
  f.drawImage(canvas,0,0,fc.width,fc.height);f.filter='none';
  if(drawCanvas)f.drawImage(drawCanvas,0,0,fc.width,fc.height);

  textLayers.forEach(function(l){
    f.save();var x=l.x*scale,y=l.y*scale,fs=l.fontSize*scale;
    f.translate(x,y+fs);f.rotate(l.rotation*Math.PI/180);
    var font='';if(l.italic)font+='italic ';if(l.bold)font+='bold ';font+=fs+'px '+l.fontFamily;
    f.font=font;f.textAlign='left';f.globalAlpha=l.opacity;
    if(l.bgColor&&l.bgColor!=='transparent'){var m=f.measureText(l.text);f.fillStyle=l.bgColor;f.fillRect(-5*scale,-fs,m.width+10*scale,fs*1.3);}
    if(l.shadow){f.shadowColor='rgba(0,0,0,0.8)';f.shadowBlur=4*scale;f.shadowOffsetX=2*scale;f.shadowOffsetY=2*scale;}
    if(l.glow){f.shadowColor=l.color;f.shadowBlur=20*scale;f.shadowOffsetX=0;f.shadowOffsetY=0;}
    if(l.outlineWidth>0){f.strokeStyle=l.outlineColor;f.lineWidth=l.outlineWidth*scale;f.strokeText(l.text,0,0);}
    f.fillStyle=l.color;f.fillText(l.text,0,0);f.restore();
  });

  stickerLayers.forEach(function(s){
    f.save();var sx=s.x*scale,sy=s.y*scale,sz=s.size*scale;
    f.translate(sx+sz/2,sy+sz/2);f.rotate((s.rotation||0)*Math.PI/180);
    if(s.flipH)f.scale(-1,1);if(s.flipV)f.scale(1,-1);
    f.globalAlpha=(s.opacity||100)/100;f.font=sz+'px serif';f.textAlign='center';f.textBaseline='middle';
    f.fillText(s.emoji,0,0);f.restore();
  });

  var wt=document.getElementById('watermarkToggle');
  if(wt&&wt.checked){var we=document.getElementById('watermarkText');var txt=we?we.value:'Meme Maker Pro';
  f.save();f.globalAlpha=0.3;f.fillStyle='#fff';f.font=(12*scale)+'px Poppins,sans-serif';f.textAlign='right';
  f.fillText(txt,fc.width-10*scale,fc.height-10*scale);f.restore();}
  return fc;
}

// ===== UTILITY =====
function showPanel(id) { var p=document.querySelectorAll('.panel'); for(var i=0;i<p.length;i++) p[i].classList.add('hidden'); var panel=document.getElementById(id); if(panel) panel.classList.remove('hidden'); }
function hidePanel(id) { var p=document.getElementById(id); if(p) p.classList.add('hidden'); }
function showHelp() { var m=document.getElementById('helpModal'); if(m) m.classList.remove('hidden'); }
function hideModal(id) { var m=document.getElementById(id); if(m) m.classList.add('hidden'); }
function toggleDarkMode() { document.body.classList.toggle('light-mode'); showToast(document.body.classList.contains('light-mode')?'☀️ Light':'🌙 Dark'); }
function showToast(msg) {
  var t=document.getElementById('toast'),m=document.getElementById('toastMessage');if(!t||!m)return;
  m.textContent=msg;t.classList.remove('hidden');if(t._to)clearTimeout(t._to);t._to=setTimeout(function(){t.classList.add('hidden');},2500);
}
function applyModalTextEdit() {
  if(selectedItemType!=='text'||selectedItemIndex<0)return;saveState();
  var input=document.getElementById('modalTextInput');if(!input)return;var text=input.value.trim();
  if(textLayers[selectedItemIndex].allCaps)text=text.toUpperCase();textLayers[selectedItemIndex].text=text;
  var e=document.getElementById('editTextInput');if(e)e.value=text;hideModal('editTextModal');renderAllOverlays();showToast('✅ Updated!');
}
window.addEventListener('resize',function(){storeCanvasBaseSize();renderAllOverlays();});
