/**
 * 拼豆像素对齐工具 - JavaScript
 * 
 * 功能：
 * 1. 上传像素图
 * 2. 四条参考线对齐四个像素格子
 * 3. 实时预览对齐状态
 * 4. 缩放查看
 * 5. 色号替换
 * 6. 生成拼豆图案
 */

// ============================================
// 全局常量定义
// ============================================

const BEAD_SIZE_CM = 0.2;  // 每个拼豆颗粒的实际物理尺寸（厘米）
const BEAD_SIZE_PX = 8;    // 每个拼豆颗粒在画布上显示的像素大小

// ============================================
// DOM 元素缓存
// ============================================

const elements = {
    // 上传相关
    uploadArea: document.getElementById('uploadArea'),
    imageInput: document.getElementById('imageInput'),
    previewContainer: document.getElementById('previewContainer'),
    previewImage: document.getElementById('previewImage'),
    previewImage2: document.getElementById('previewImage2'),
    
    // 参考线控制
    lineY1: document.getElementById('lineY1'),
    lineY2: document.getElementById('lineY2'),
    lineX1: document.getElementById('lineX1'),
    lineX2: document.getElementById('lineX2'),
    lineY1Value: document.getElementById('lineY1Value'),
    lineY2Value: document.getElementById('lineY2Value'),
    lineX1Value: document.getElementById('lineX1Value'),
    lineX2Value: document.getElementById('lineX2Value'),
    
    // 参考线可视化
    lineY1Visual: document.getElementById('lineY1Visual'),
    lineY2Visual: document.getElementById('lineY2Visual'),
    lineX1Visual: document.getElementById('lineX1Visual'),
    lineX2Visual: document.getElementById('lineX2Visual'),
    selectedArea: document.getElementById('selectedArea'),
    
    // 格子信息
    gridWidth: document.getElementById('gridWidth'),
    gridHeight: document.getElementById('gridHeight'),
    totalCells: document.getElementById('totalCells'),
    
    // 角点信息
    cornerTL: document.getElementById('cornerTL'),
    cornerTR: document.getElementById('cornerTR'),
    cornerBL: document.getElementById('cornerBL'),
    cornerBR: document.getElementById('cornerBR'),
    cornerColorTL: document.getElementById('cornerColorTL'),
    cornerColorTR: document.getElementById('cornerColorTR'),
    cornerColorBL: document.getElementById('cornerColorBL'),
    cornerColorBR: document.getElementById('cornerColorBR'),
    
    // 品牌和色号
    brandSelect: document.getElementById('brandSelect'),
    colorItems: document.getElementById('colorItems'),
    colorLimit: document.getElementById('colorLimit'),
    
    // 按钮
    generateBtn: document.getElementById('generateBtn'),
    downloadCanvas: document.getElementById('downloadCanvas'),
    downloadLegend: document.getElementById('downloadLegend'),
    pickerTool: document.getElementById('pickerTool'),
    colorPicker: document.getElementById('colorPicker'),
    
    // 缩放控制
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    resetZoomBtn: document.getElementById('resetZoomBtn'),
    zoomLevel: document.getElementById('zoomLevel'),
    alignmentPreview: document.getElementById('alignmentPreview'),
    imageContainer: document.getElementById('imageContainer'),
    
    // 结果区缩放控制
    resultZoomInBtn: document.getElementById('resultZoomInBtn'),
    resultZoomOutBtn: document.getElementById('resultZoomOutBtn'),
    resultResetZoomBtn: document.getElementById('resultResetZoomBtn'),
    resultZoomLevel: document.getElementById('resultZoomLevel'),
    
    // 结果区
    resultGrid: document.getElementById('resultGrid'),
    resultGridContainer: document.getElementById('resultGridContainer'),
    resultCanvas: document.getElementById('resultCanvas'),
    resultSection: document.getElementById('resultSection'),
    colorSummary: document.getElementById('colorSummary'),
    totalBeads: document.getElementById('totalBeads'),
    usedColors: document.getElementById('usedColors'),
    patternSize: document.getElementById('patternSize'),
    
    // 拖拽调整
    resizeHandle: document.getElementById('resizeHandle'),
    leftPanel: document.querySelector('.left-panel'),
    mainContent: document.querySelector('.main-content')
};

// ============================================
// 状态变量
// ============================================

let uploadedImage = null;        // 上传的图片
let imageWidth = 0;              // 图片宽度
let imageHeight = 0;             // 图片高度
let currentBrand = 'MARD';       // 当前品牌
let zoom = 1;                    // 缩放比例
let resultZoom = 1;              // 结果区缩放比例
let pickerMode = false;          // 吸管工具模式

// 四个角点的像素数据
let cornerPixels = {
    tl: null,
    tr: null,
    bl: null,
    br: null
};

// 格子区域数据
let gridData = [];
let gridSize = { width: 0, height: 0 };

// 色号映射
let colorMapping = new Map(); // 原色 -> 色号
let usedColorMap = new Map();
let colorCountMap = new Map();

// ============================================
// 初始化
// ============================================

function init() {
    setupEventListeners();
    renderColorList();
    // 初始化时禁用微调按钮
    updateLineButtonsState(false);
}

function setupEventListeners() {
    // 上传相关
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.imageInput.addEventListener('change', handleImageSelect);
    
    // 参考线控制
    elements.lineY1.addEventListener('input', function() {
        // 保存精确的像素值
        const percent = parseFloat(this.value);
        currentPixelValues.y1 = Math.round(imageHeight * percent / 100);
        updateReferenceLines(false);
    });
    elements.lineY2.addEventListener('input', function() {
        const percent = parseFloat(this.value);
        currentPixelValues.y2 = Math.round(imageHeight * percent / 100);
        updateReferenceLines(false);
    });
    elements.lineX1.addEventListener('input', function() {
        const percent = parseFloat(this.value);
        currentPixelValues.x1 = Math.round(imageWidth * percent / 100);
        updateReferenceLines(false);
    });
    elements.lineX2.addEventListener('input', function() {
        const percent = parseFloat(this.value);
        currentPixelValues.x2 = Math.round(imageWidth * percent / 100);
        updateReferenceLines(false);
    });

    // 参考线微调按钮 - 每次加1或减1像素
    document.querySelectorAll('.line-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const stepPixels = parseInt(this.dataset.step);
            const valueSpan = elements[targetId + 'Value'];

            if (!valueSpan) return;
            if (!uploadedImage) return;

            // 获取当前像素值
            let currentPixels = parseInt(valueSpan.textContent);
            let newPixels = currentPixels + stepPixels;

            // 边界检查
            const isYAxis = targetId.includes('Y');
            const maxDim = isYAxis ? imageHeight : imageWidth;
            newPixels = Math.max(0, Math.min(maxDim, newPixels));

            // 映射 targetId 到 currentPixelValues 的属性
            const valueMap = {
                'lineY1': 'y1',
                'lineY2': 'y2',
                'lineX1': 'x1',
                'lineX2': 'x2'
            };
            const valueKey = valueMap[targetId];

            // 更新保存的像素值
            currentPixelValues[valueKey] = newPixels;

            // 更新滑块值为对应的百分比（保留精度让滑块可以显示）
            const input = elements[targetId];
            const newPercent = (newPixels / maxDim) * 100;
            input.value = newPercent;

            // 调用 updateReferenceLines(false) 来使用保存的像素值
            updateReferenceLines(false);
        });
    });
    
    // 缩放控制
    elements.zoomInBtn.addEventListener('click', () => zoomImage(0.2));
    elements.zoomOutBtn.addEventListener('click', () => zoomImage(-0.2));
    elements.resetZoomBtn.addEventListener('click', resetZoom);
    
    // 品牌选择
    elements.brandSelect.addEventListener('change', () => {
        currentBrand = elements.brandSelect.value;
        renderColorList();
    });
    
    // 生成按钮
    elements.generateBtn.addEventListener('click', generatePattern);
    
    // 吸管工具
    elements.pickerTool.addEventListener('click', () => {
        pickerMode = !pickerMode;
        elements.pickerTool.classList.toggle('active', pickerMode);
    });
    
    // 点击格子修改颜色
    elements.resultGrid.addEventListener('click', handleGridCellClick);
    
    // 结果区缩放控制（只能放大）
    elements.resultZoomInBtn.addEventListener('click', () => zoomResultImage(0.2));
    elements.resultZoomOutBtn.addEventListener('click', () => zoomResultImage(-0.2));
    elements.resultResetZoomBtn.addEventListener('click', resetResultZoom);
    
    // 下载
    elements.downloadCanvas.addEventListener('click', downloadCanvas);
    elements.downloadLegend.addEventListener('click', downloadLegend);
    
    // 拖拽调整宽度
    setupResizeHandle();
}

// ============================================
// 拖拽上传处理
// ============================================

function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        loadImage(files[0]);
    }
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        loadImage(file);
    }
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            imageWidth = img.width;
            imageHeight = img.height;
            
            // 显示预览
            elements.previewImage.src = e.target.result;
            elements.previewImage2.src = e.target.result;
            elements.previewContainer.classList.add('has-image');
            
            // 初始化参考线位置
            initReferenceLines();
            
            // 更新格子信息
            updateGridInfo();
            
            // 更新角点信息
            updateCornerInfo();
            
            // 启用生成按钮
            elements.generateBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initReferenceLines() {
    // 设置默认参考线位置
    const y1 = Math.floor(imageHeight * 0.1);
    const y2 = Math.floor(imageHeight * 0.9);
    const x1 = Math.floor(imageWidth * 0.1);
    const x2 = Math.floor(imageWidth * 0.9);
    
    elements.lineY1.value = 10;
    elements.lineY2.value = 90;
    elements.lineX1.value = 10;
    elements.lineX2.value = 90;
    
    elements.lineY1Value.textContent = y1;
    elements.lineY2Value.textContent = y2;
    elements.lineX1Value.textContent = x1;
    elements.lineX2Value.textContent = x2;

    // 启用微调按钮
    updateLineButtonsState(true);

    updateReferenceLines(false);
}

// 更新微调按钮状态
function updateLineButtonsState(enabled) {
    document.querySelectorAll('.line-btn').forEach(btn => {
        if (enabled) {
            btn.removeAttribute('disabled');
        } else {
            btn.setAttribute('disabled', 'disabled');
        }
        btn.style.opacity = enabled ? '1' : '0.5';
        btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
}

// 保存当前的像素值，不经过百分比转换
let currentPixelValues = {
    y1: 0,
    y2: 0,
    x1: 0,
    x2: 0
};

function updateReferenceLines(forceUpdateFromSlider) {
    if (!uploadedImage) return;

    // 获取百分比值
    const y1Percent = parseFloat(elements.lineY1.value);
    const y2Percent = parseFloat(elements.lineY2.value);
    const x1Percent = parseFloat(elements.lineX1.value);
    const x2Percent = parseFloat(elements.lineX2.value);

    // 转换为像素值
    let y1 = Math.round(imageHeight * y1Percent / 100);
    let y2 = Math.round(imageHeight * y2Percent / 100);
    let x1 = Math.round(imageWidth * x1Percent / 100);
    let x2 = Math.round(imageWidth * x2Percent / 100);

    // forceUpdateFromSlider = true 表示从滑块输入触发，需要使用计算出的值并保存
    // forceUpdateFromSlider = false 或 undefined 表示使用保存的像素值
    if (forceUpdateFromSlider === true) {
        // 从滑块触发，保存当前像素值
        currentPixelValues = { y1, y2, x1, x2 };
    } else if (currentPixelValues.y1 !== undefined) {
        // 使用保存的像素值
        y1 = currentPixelValues.y1;
        y2 = currentPixelValues.y2;
        x1 = currentPixelValues.x1;
        x2 = currentPixelValues.x2;
    } else {
        // 第一次调用，保存初始值
        currentPixelValues = { y1, y2, x1, x2 };
    }

    // 更新滑块显示值
    elements.lineY1Value.textContent = y1;
    elements.lineY2Value.textContent = y2;
    elements.lineX1Value.textContent = x1;
    elements.lineX2Value.textContent = x2;

    // 更新可视化参考线
    elements.lineY1Visual.style.top = (y1 * zoom) + 'px';
    elements.lineY2Visual.style.top = (y2 * zoom) + 'px';
    elements.lineX1Visual.style.left = (x1 * zoom) + 'px';
    elements.lineX2Visual.style.left = (x2 * zoom) + 'px';

    // 更新选中区域
    const gridWidth = x2 - x1;
    const gridHeight = y2 - y1;
    elements.selectedArea.style.left = (x1 * zoom) + 'px';
    elements.selectedArea.style.top = (y1 * zoom) + 'px';
    elements.selectedArea.style.width = (gridWidth * zoom) + 'px';
    elements.selectedArea.style.height = (gridHeight * zoom) + 'px';

    // 更新格子信息
    updateGridInfo();

    // 更新角点信息
    updateCornerInfo();
}

function updateGridInfo() {
    if (!uploadedImage) return;
    
    const y1 = parseInt(elements.lineY1Value.textContent);
    const y2 = parseInt(elements.lineY2Value.textContent);
    const x1 = parseInt(elements.lineX1Value.textContent);
    const x2 = parseInt(elements.lineX2Value.textContent);
    
    const gridWidth = x2 - x1;
    const gridHeight = y2 - y1;
    const totalCells = gridWidth * gridHeight;
    
    elements.gridWidth.textContent = gridWidth;
    elements.gridHeight.textContent = gridHeight;
    elements.totalCells.textContent = totalCells;
}

function updateCornerInfo() {
    if (!uploadedImage) return;
    
    const y1 = parseInt(elements.lineY1Value.textContent);
    const y2 = parseInt(elements.lineY2Value.textContent);
    const x1 = parseInt(elements.lineX1Value.textContent);
    const x2 = parseInt(elements.lineX2Value.textContent);
    
    // 获取四个角点的像素颜色
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(uploadedImage, 0, 0);
    
    const getPixelColor = (x, y) => {
        const data = ctx.getImageData(x, y, 1, 1).data;
        return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
    };
    
    const getHexColor = (x, y) => {
        const data = ctx.getImageData(x, y, 1, 1).data;
        return '#' + [data[0], data[1], data[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    };
    
    // 更新角点位置显示
    elements.cornerTL.textContent = `(${x1}, ${y1})`;
    elements.cornerTR.textContent = `(${x2}, ${y1})`;
    elements.cornerBL.textContent = `(${x1}, ${y2})`;
    elements.cornerBR.textContent = `(${x2}, ${y2})`;
    
    // 更新角点颜色
    elements.cornerColorTL.style.backgroundColor = getHexColor(x1, y1);
    elements.cornerColorTR.style.backgroundColor = getHexColor(x2, y1);
    elements.cornerColorBL.style.backgroundColor = getHexColor(x1, y2);
    elements.cornerColorBR.style.backgroundColor = getHexColor(x2, y2);
    
    // 保存角点像素数据
    cornerPixels = {
        tl: { x: x1, y: y1, hex: getHexColor(x1, y1) },
        tr: { x: x2, y: y1, hex: getHexColor(x2, y1) },
        bl: { x: x1, y: y2, hex: getHexColor(x1, y2) },
        br: { x: x2, y: y2, hex: getHexColor(x2, y2) }
    };
}

// ============================================
// 缩放功能
// ============================================

function zoomImage(delta) {
    zoom = Math.max(0.1, Math.min(5, zoom + delta));
    updateZoom();
}

function resetZoom() {
    zoom = 1;
    updateZoom();
}

function updateZoom() {
    elements.zoomLevel.textContent = Math.round(zoom * 100) + '%';
    elements.previewImage2.style.transform = `scale(${zoom})`;
    
    // 重新计算参考线位置
    updateReferenceLines();
}

// ============================================
// 结果区缩放功能
// ============================================

function zoomResultImage(delta) {
    // 只能放大，缩小范围限制在 100%-10%
    const newZoom = resultZoom + delta;
    if (delta > 0) {
        // 放大：最大到 500%
        resultZoom = Math.min(5, newZoom);
    } else {
        // 缩小：最小到 100%
        resultZoom = Math.max(1, newZoom);
    }
    updateResultZoom();
}

function resetResultZoom() {
    resultZoom = 1;
    updateResultZoom();
}

function updateResultZoom() {
    elements.resultZoomLevel.textContent = Math.round(resultZoom * 100) + '%';
    elements.resultGridContainer.style.transform = `scale(${resultZoom})`;
    elements.resultGridContainer.style.transformOrigin = 'top left';
}

// ============================================
// 色号列表
// ============================================

function renderColorList() {
    const colors = window.brandColors[currentBrand];
    elements.colorItems.innerHTML = '';
    
    colors.forEach(color => {
        const item = document.createElement('div');
        item.className = 'color-item-replace';
        item.innerHTML = `
            <div class="color-swatch" style="background-color: #${color.hex}"></div>
            <span>${color.code}</span>
        `;
        item.addEventListener('click', () => selectColorForReplacement(color));
        elements.colorItems.appendChild(item);
    });
}

function selectColorForReplacement(color) {
    // 这个功能用于替换特定颜色的色号
    // 目前可以点击色号来查看信息
    const items = elements.colorItems.querySelectorAll('.color-item-replace');
    items.forEach(item => item.classList.remove('selected'));
    event.target.closest('.color-item-replace').classList.add('selected');
}

// ============================================
// 生成拼豆图案
// ============================================

function generatePattern() {
    try {
        if (!uploadedImage) {
            alert('请先上传图片');
            return;
        }
        
        // 获取参考线的像素位置
        let y1 = parseInt(elements.lineY1Value.textContent);
        let y2 = parseInt(elements.lineY2Value.textContent);
        let x1 = parseInt(elements.lineX1Value.textContent);
        let x2 = parseInt(elements.lineX2Value.textContent);
        
        console.log('参考线位置:', { y1, y2, x1, x2 });
        console.log('图像尺寸:', { imageWidth, imageHeight });
        
        // 参考线框选的是4个格子（2x2）
        // 单个格子大小 = 参考线距离 / 2
        const totalCellWidth = Math.abs(x2 - x1);
        const totalCellHeight = Math.abs(y2 - y1);
        const cellWidth = Math.floor(totalCellWidth / 2);
        const cellHeight = Math.floor(totalCellHeight / 2);
        
        console.log('格子大小:', { cellWidth, cellHeight });
        
        if (cellWidth <= 0 || cellHeight <= 0) {
            alert('请正确设置参考线位置，确保形成有效的格子');
            return;
        }
        
        // 计算整个图像可以划分多少个格子
        const gridWidth = Math.floor(imageWidth / cellWidth);
        const gridHeight = Math.floor(imageHeight / cellHeight);
        
        console.log('网格尺寸:', { gridWidth, gridHeight });
        
        if (gridWidth <= 0 || gridHeight <= 0) {
            alert('参考线间距过大，无法形成有效的网格');
            return;
        }
        
        // 创建临时canvas提取图像数据
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageWidth;
        tempCanvas.height = imageHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(uploadedImage, 0, 0);
        
        // 获取整图像素数据（只获取一次，避免性能问题）
        const fullImageData = tempCtx.getImageData(0, 0, imageWidth, imageHeight);
        const pixels = fullImageData.data;
        
        console.log('像素数据长度:', pixels.length);
        
        // 准备网格数据
        gridSize = { width: gridWidth, height: gridHeight };
        gridData = [];
        colorMapping.clear();
        usedColorMap.clear();
        colorCountMap.clear();
        
        const brandColorList = window.brandColors[currentBrand];
        console.log('品牌色号数量:', brandColorList.length);
        
        // 获取色号限制
        const colorLimitInput = elements.colorLimit.value;
        const colorLimit = colorLimitInput ? parseInt(colorLimitInput) : null;
        console.log('色号限制:', colorLimit);
        
        // 如果有限制色号数量的需求，需要两遍遍历
        // 第一遍：收集所有像素的颜色统计
        let tempColorCountMap = new Map();
        let tempColorMap = new Map();
        
        for (let gy = 0; gy < gridHeight; gy++) {
            gridData[gy] = [];
            for (let gx = 0; gx < gridWidth; gx++) {
                const pixelX = gx * cellWidth;
                const pixelY = gy * cellHeight;
                const safeX = Math.min(pixelX, imageWidth - 1);
                const safeY = Math.min(pixelY, imageHeight - 1);
                const idx = (safeY * imageWidth + safeX) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                
                // 找到最接近的颜色
                let minDist = Infinity;
                let closestColor = brandColorList[0];
                
                for (const color of brandColorList) {
                    const dist = colorDistance(r, g, b, color.rgb[0], color.rgb[1], color.rgb[2]);
                    if (dist < minDist) {
                        minDist = dist;
                        closestColor = color;
                    }
                }
                
                // 第一遍统计
                if (!tempColorMap.has(closestColor.code)) {
                    tempColorMap.set(closestColor.code, closestColor);
                    tempColorCountMap.set(closestColor.code, 1);
                } else {
                    tempColorCountMap.set(closestColor.code, tempColorCountMap.get(closestColor.code) + 1);
                }
            }
        }
        
        // 确定最终使用的色号（按使用次数排序，取前N个）
        let limitedColorList;
        if (colorLimit && colorLimit > 0) {
            const sortedColors = Array.from(tempColorCountMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, colorLimit);
            limitedColorList = sortedColors.map(([code]) => tempColorMap.get(code));
            console.log('限制后的色号数量:', limitedColorList.length);
        } else {
            limitedColorList = Array.from(tempColorMap.values());
        }
        
        // 重新遍历，映射到限制后的色号
        usedColorMap.clear();
        colorCountMap.clear();
        
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                const pixelX = gx * cellWidth;
                const pixelY = gy * cellHeight;
                const safeX = Math.min(pixelX, imageWidth - 1);
                const safeY = Math.min(pixelY, imageHeight - 1);
                const idx = (safeY * imageWidth + safeX) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                
                // 只在限制的色号中找最接近的
                let minDist = Infinity;
                let closestColor = limitedColorList[0];
                
                for (const color of limitedColorList) {
                    const dist = colorDistance(r, g, b, color.rgb[0], color.rgb[1], color.rgb[2]);
                    if (dist < minDist) {
                        minDist = dist;
                        closestColor = color;
                    }
                }
                
                gridData[gy][gx] = closestColor;
                
                // 统计使用次数
                if (!usedColorMap.has(closestColor.code)) {
                    usedColorMap.set(closestColor.code, closestColor);
                    colorCountMap.set(closestColor.code, 1);
                } else {
                    colorCountMap.set(closestColor.code, colorCountMap.get(closestColor.code) + 1);
                }
            }
        }
        
        console.log('网格数据生成完成');
        
        // 显示结果
        elements.resultSection.style.display = 'block';
        renderResultGrid(24);
        updateResultCanvas();
        updateStats();
        
        // 滚动到结果区
        elements.resultSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('生成图案时出错:', error);
        alert('生成图案时出错: ' + error.message);
    }
}

// 计算颜色距离
function colorDistance(r1, g1, b1, r2, g2, b2) {
    // 使用欧几里得距离
    return Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
    );
}

// 渲染网格
function renderResultGrid(cellSize = 24) {
    const { width, height } = gridSize;
    
    elements.resultGrid.innerHTML = '';
    
    // 创建表格
    const table = document.createElement('table');
    table.className = 'bead-grid-table';
    table.style.setProperty('--cell-size', cellSize + 'px');
    
    // 创建表头（顶部坐标：1, 2, 3...）
    const thead = document.createElement('thead');
    let headerRow = '<tr><th class="grid-corner"></th>';
    for (let c = 1; c <= width; c++) {
        headerRow += `<th class="grid-col-num">${c}</th>`;
    }
    headerRow += '<th class="grid-corner"></th></tr>';
    thead.innerHTML = headerRow;
    table.appendChild(thead);
    
    // 表体
    const tbody = document.createElement('tbody');
    for (let y = 0; y < height; y++) {
        const row = document.createElement('tr');
        
        // 左边坐标：1, 2, 3...
        const leftNum = document.createElement('th');
        leftNum.className = 'grid-row-num';
        leftNum.textContent = y + 1;
        row.appendChild(leftNum);
        
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('td');
            cell.className = 'grid-cell';
            const color = gridData[y][x];
            cell.style.backgroundColor = '#' + color.hex;
            cell.title = `${color.code} (${x + 1}, ${y + 1})`;
            
            // 显示色号
            cell.textContent = color.code;
            cell.style.color = getContrastColor(color.hex);
            cell.style.fontSize = Math.min(cellSize - 4, 11) + 'px';
            cell.style.fontWeight = 'bold';
            cell.style.textAlign = 'center';
            cell.style.lineHeight = cellSize + 'px';
            cell.style.padding = '0';
            
            row.appendChild(cell);
        }
        
        // 右边坐标：..., 3, 2, 1 (从下往上)
        const rightNum = document.createElement('th');
        rightNum.className = 'grid-row-num';
        rightNum.textContent = height - y;
        row.appendChild(rightNum);
        
        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    
    // 创建表尾（底部坐标：..., 3, 2, 1 从右到左）
    const tfoot = document.createElement('tfoot');
    let footerRow = '<tr><th class="grid-corner"></th>';
    for (let c = width; c >= 1; c--) {
        footerRow += `<th class="grid-col-num">${c}</th>`;
    }
    footerRow += '<th class="grid-corner"></th></tr>';
    tfoot.innerHTML = footerRow;
    table.appendChild(tfoot);
    
    elements.resultGrid.appendChild(table);
}

// 根据背景色计算对比文字颜色
function getContrastColor(hex) {
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let l = (max + min) / 2;
    
    // 计算饱和度（HSL方式）
    let s = 0;
    if (max !== min) {
        s = (max === 0 || max === 1) ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    }
    
    // 饱和度低或亮度非常高（接近白色）用黑色
    // 饱和度 < 0.15 或 亮度 > 0.92 时认为是浅色
    if (s < 0.15 || l > 0.92) {
        return '#000000';
    }
    
    // 饱和度高且亮度低用白色
    if (s > 0.5 || l < 0.25) {
        return '#ffffff';
    }
    
    // 中等饱和度时用亮度判断
    return l > 0.5 ? '#000000' : '#ffffff';
}

// 更新结果画布
function updateResultCanvas() {
    const canvas = elements.resultCanvas;
    const ctx = canvas.getContext('2d');
    const beadSize = BEAD_SIZE_PX;
    
    canvas.width = gridSize.width * beadSize;
    canvas.height = gridSize.height * beadSize;
    
    for (let y = 0; y < gridSize.height; y++) {
        for (let x = 0; x < gridSize.width; x++) {
            const cell = gridData[y][x];
            ctx.fillStyle = '#' + cell.hex;
            ctx.fillRect(x * beadSize, y * beadSize, beadSize, beadSize);
        }
    }
}

// 更新统计信息
function updateStats() {
    const total = gridSize.width * gridSize.height;
    const used = usedColorMap.size;
    const sizeCm = {
        width: (gridSize.width * BEAD_SIZE_CM).toFixed(1),
        height: (gridSize.height * BEAD_SIZE_CM).toFixed(1)
    };
    
    elements.totalBeads.textContent = total;
    elements.usedColors.textContent = used;
    elements.patternSize.textContent = `${sizeCm.width} × ${sizeCm.height} cm`;
    
    // 渲染色号和数量统计
    renderColorSummary();
}

// 渲染色号和数量统计
function renderColorSummary() {
    const container = elements.colorSummary;
    container.innerHTML = '';
    
    if (colorCountMap.size === 0) {
        container.innerHTML = '<p class="no-data">暂无数据</p>';
        return;
    }
    
    const title = document.createElement('h3');
    title.className = 'color-summary-title';
    title.textContent = '色号与数量统计';
    container.appendChild(title);
    
    const list = document.createElement('div');
    list.className = 'color-summary-list';
    
    // 按数量排序
    const sortedColors = Array.from(colorCountMap.entries())
        .sort((a, b) => b[1] - a[1]);
    
    sortedColors.forEach(([code, count]) => {
        const item = document.createElement('div');
        item.className = 'color-summary-item';
        
        // 查找颜色信息
        let colorInfo = null;
        for (const brand in window.brandColors) {
            const colors = window.brandColors[brand];
            colorInfo = colors.find(c => c.code === code);
            if (colorInfo) break;
        }
        
        const colorBox = document.createElement('div');
        colorBox.className = 'color-box';
        colorBox.style.backgroundColor = colorInfo ? '#' + colorInfo.hex : '#ccc';
        
        const codeSpan = document.createElement('span');
        codeSpan.className = 'color-code';
        codeSpan.textContent = code;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'color-count';
        countSpan.textContent = '× ' + count;
        
        item.appendChild(colorBox);
        item.appendChild(codeSpan);
        item.appendChild(countSpan);
        list.appendChild(item);
    });
    
    container.appendChild(list);
}

// 点击格子修改颜色
function handleGridCellClick(e) {
    if (!pickerMode) return;
    
    const cell = e.target.closest('.grid-cell');
    if (!cell) return;
    
    const row = cell.parentElement;
    const cellIndex = Array.from(row.children).indexOf(cell) - 1;
    const rowIndex = Array.from(row.parentElement.children).indexOf(row);
    
    if (rowIndex < 0 || cellIndex < 0) return;
    if (rowIndex >= gridData.length || cellIndex >= gridData[0].length) return;
    
    // 获取选中的颜色
    const pickerColor = elements.colorPicker.value;
    const r = parseInt(pickerColor.slice(1, 3), 16);
    const g = parseInt(pickerColor.slice(3, 5), 16);
    const b = parseInt(pickerColor.slice(5, 7), 16);
    
    // 找到最接近的色号
    const brandColorList = window.brandColors[currentBrand];
    let minDist = Infinity;
    let closestColor = brandColorList[0];
    
    for (const color of brandColorList) {
        const dist = colorDistance(r, g, b, color.rgb[0], color.rgb[1], color.rgb[2]);
        if (dist < minDist) {
            minDist = dist;
            closestColor = color;
        }
    }
    
    // 更新格子
    const oldColor = gridData[rowIndex][cellIndex];
    gridData[rowIndex][cellIndex] = closestColor;
    
    // 更新显示
    cell.style.backgroundColor = '#' + closestColor.hex;
    cell.title = `${closestColor.code} (${cellIndex + 1}, ${rowIndex + 1})`;
    
    // 更新统计
    colorCountMap.set(oldColor.code, colorCountMap.get(oldColor.code) - 1);
    if (colorCountMap.get(oldColor.code) <= 0) {
        colorCountMap.delete(oldColor.code);
        usedColorMap.delete(oldColor.code);
    }
    
    if (!usedColorMap.has(closestColor.code)) {
        usedColorMap.set(closestColor.code, closestColor);
        colorCountMap.set(closestColor.code, 1);
    } else {
        colorCountMap.set(closestColor.code, colorCountMap.get(closestColor.code) + 1);
    }
    
    updateResultCanvas();
    updateStats();
}

// 下载图案（高清带色号和数量）
function downloadCanvas() {
    const { width, height } = gridSize;
    const cellSize = 60; // 更大尺寸，更高清
    const scale = 2; // 2倍清晰度
    const labelWidth = 40; // 坐标标签宽度
    const padding = 30;
    
    // 色号统计：与网页一致，每项为「色彩格子+色号+数量」的标签样式（圆角灰底框）
    const sortedColors = Array.from(colorCountMap.entries())
        .sort((a, b) => b[1] - a[1]);
    
    const tagStyle = {
        colorBoxSize: 20,
        gap: 6,
        paddingH: 10,
        paddingV: 6,
        borderRadius: 6,
        bgColor: '#f5f5f5',
        borderColor: '#e0e0e0',
        codeFont: 'bold 14px Arial',
        countFont: '13px Arial',
        fixedWidth: 140  // 固定宽度，统一排版
    };
    const statsLineHeight = tagStyle.colorBoxSize + tagStyle.paddingV * 2;
    const statsGap = 10;
    let colorStatsHeight = 0;
    let tagLayout = []; // { x, y, w, h, code, count, colorInfo }
    if (colorCountMap.size > 0) {
        const maxRowWidth = width * cellSize + labelWidth + padding * 2 - padding;
        let rowY = 0, rowX = 0;
        sortedColors.forEach(([code, count]) => {
            let colorInfo = null;
            for (const brand in window.brandColors) {
                const colors = window.brandColors[brand];
                colorInfo = colors.find(c => c.code === code);
                if (colorInfo) break;
            }
            // 固定宽度，统一排版
            const tagW = tagStyle.fixedWidth;
            const tagH = statsLineHeight;
            if (rowX + tagW > maxRowWidth && rowX > 0) {
                rowX = 0;
                rowY += tagH + statsGap;
            }
            tagLayout.push({ x: rowX, y: rowY, w: tagW, h: tagH, code, count, colorInfo });
            rowX += tagW + statsGap;
        });
        colorStatsHeight = rowY + statsLineHeight + 60;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 边缘留出2个格子的距离
    const margin = cellSize * 2;
    
    // 总宽度 = 左边坐标 + 网格 + 右边坐标 + padding + 边缘 margin
    // 总高度 = 顶部坐标 + 网格 + 底部坐标 + padding + 色号统计 + 底部留白2个格子 + 边缘 margin
    const totalWidth = margin + labelWidth + width * cellSize + labelWidth + padding * 2 + margin;
    const totalHeight = margin + labelWidth + height * cellSize + labelWidth + padding * 2 + colorStatsHeight + cellSize * 2 + margin;
    
    // 启用高分辨率（先设置scale后的尺寸）
    canvas.width = totalWidth * scale;
    canvas.height = totalHeight * scale;
    ctx.scale(scale, scale);
    
    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    
    // 绘制坐标轴标签背景（灰色）
    ctx.fillStyle = '#e8e8e8';

    // 四个坐标背景延长相交形成正方形
    // 顶部坐标背景 - 与左右两边最外侧对齐
    ctx.fillRect(margin, margin, margin + labelWidth + width * cellSize + labelWidth + padding - margin, labelWidth);
    // 底部坐标背景 - 与顶部对齐
    ctx.fillRect(margin, margin + labelWidth + height * cellSize + labelWidth + padding - cellSize / 5, margin + labelWidth + width * cellSize + labelWidth + padding - margin, labelWidth);
    // 左边坐标背景 - 与上下两边最外侧对齐
    ctx.fillRect(margin, margin, labelWidth, margin + labelWidth + height * cellSize + labelWidth + padding - margin);
    // 右边坐标背景 - 与底部坐标背景底部对齐
    const bottomCoordBottom = margin + labelWidth + height * cellSize + labelWidth + padding - cellSize / 5 + labelWidth;
    ctx.fillRect(margin + labelWidth + width * cellSize + labelWidth + padding - cellSize / 5, margin, labelWidth, bottomCoordBottom - margin);
    
    // 绘制坐标轴标签设置
    ctx.fillStyle = '#555';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 顶部坐标 (1, 2, 3, ...)
    for (let x = 1; x <= width; x++) {
        const px = margin + labelWidth + padding + (x - 1) * cellSize + cellSize / 2;
        ctx.fillText(x.toString(), px, margin + labelWidth / 2);
    }
    
    // 底部坐标 (..., 3, 2, 1) - 向上移动1/5格子，在底部灰色背景内上下居中
    for (let x = 1; x <= width; x++) {
        const px = margin + labelWidth + padding + (x - 1) * cellSize + cellSize / 2;
        const bottomY = margin + labelWidth + height * cellSize + labelWidth + padding - cellSize / 5 + labelWidth / 2;
        ctx.fillText((width - x + 1).toString(), px, bottomY);
    }
    
    // 左边坐标 (1, 2, 3, ...)
    for (let y = 1; y <= height; y++) {
        const py = margin + labelWidth + padding + (y - 1) * cellSize + cellSize / 2;
        ctx.fillText(y.toString(), margin + labelWidth / 2, py);
    }
    
    // 右边坐标 (..., 3, 2, 1) - 与每行色号对齐
    for (let y = 1; y <= height; y++) {
        const rightX = margin + labelWidth + width * cellSize + labelWidth + padding - cellSize / 5 + labelWidth / 2;
        const py = margin + labelWidth + padding + (y - 1) * cellSize + cellSize / 2;
        ctx.fillText((height - y + 1).toString(), rightX, py);
    }
    
    // 绘制网格（从左下角开始，考虑坐标标签）
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const color = gridData[y][x];
            // px: 左边标签 + padding + x * cellSize
            const px = margin + labelWidth + padding + x * cellSize;
            // py: 顶部标签 + padding + y * cellSize
            const py = margin + labelWidth + padding + y * cellSize;
            
            // 填充颜色
            ctx.fillStyle = '#' + color.hex;
            ctx.fillRect(px, py, cellSize, cellSize);
            
            // 边框
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, cellSize, cellSize);
            
            // 显示色号
            ctx.fillStyle = getContrastColor(color.hex);
            ctx.font = `bold 20px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(color.code, px + cellSize / 2, py + cellSize / 2);
        }
    }
    
    // 绘制色号统计（与网页一致：标签样式 = 色彩格子 + 色号 + 数量）
    if (colorCountMap.size > 0 && tagLayout.length > 0) {
        // 色号统计顶部与拼豆图纸距离近一点，下方留白2个格子
        const baseY = margin + labelWidth + height * cellSize + labelWidth + padding + cellSize * 2;
        ctx.fillStyle = '#333';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('色号与数量统计', margin + padding, baseY);
        const listStartY = baseY + 35;
        
        const drawRoundRect = (x, y, w, h, r) => {
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, w, h, r);
                ctx.fill();
                ctx.stroke();
            } else {
                const pi = Math.PI;
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.arc(x + w - r, y + r, r, -pi/2, pi/2);
                ctx.lineTo(x + w, y + h - r);
                ctx.arc(x + w - r, y + h - r, r, pi/2, pi/2*3);
                ctx.lineTo(x + r, y + h);
                ctx.arc(x + r, y + h - r, r, pi/2*3, pi/2*3 + pi/2);
                ctx.lineTo(x, y + r);
                ctx.arc(x + r, y + r, r, pi, pi*1.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        };
        
        tagLayout.forEach(({ x, y, w, h, code, count, colorInfo }) => {
            const tx = margin + padding + x;
            const ty = listStartY + y;
            const ts = tagStyle;
            
            // 标签圆角底
            ctx.fillStyle = ts.bgColor;
            ctx.strokeStyle = ts.borderColor;
            ctx.lineWidth = 1;
            drawRoundRect(tx, ty, w, h, ts.borderRadius);
            
            // 色彩格子（与网页 .color-box 一致）
            const boxX = tx + ts.paddingH;
            const boxY = ty + (h - ts.colorBoxSize) / 2;
            const bgColor = colorInfo ? '#' + colorInfo.hex : '#ccc';
            ctx.fillStyle = bgColor;
            ctx.fillRect(boxX, boxY, ts.colorBoxSize, ts.colorBoxSize);
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, ts.colorBoxSize, ts.colorBoxSize);
            
            // 色号（格子右侧，与网页 .color-code 一致）
            ctx.fillStyle = '#333';
            ctx.font = ts.codeFont;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(code, boxX + ts.colorBoxSize + ts.gap, ty + h / 2);
            
            // 数量（× N，与网页 .color-count 一致）
            ctx.fillStyle = '#666';
            ctx.font = ts.countFont;
            ctx.fillText('× ' + count, boxX + ts.colorBoxSize + ts.gap + ctx.measureText(code).width + ts.gap, ty + h / 2);
        });
    }
    
    // 下载
    const link = document.createElement('a');
    link.download = 'bead-pattern.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
}

// 下载色号表（与色号与数量统计一致的标签样式）
function downloadLegend() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scale = 2;
    const padding = 20;
    const tagStyle = {
        colorBoxSize: 20,
        gap: 6,
        paddingH: 10,
        paddingV: 6,
        borderRadius: 6,
        bgColor: '#f5f5f5',
        borderColor: '#e0e0e0',
        codeFont: 'bold 14px Arial',
        countFont: '13px Arial',
        fixedWidth: 140
    };
    const statsLineHeight = tagStyle.colorBoxSize + tagStyle.paddingV * 2;
    const statsGap = 10;
    
    // 计算布局
    const sortedColors = Array.from(colorCountMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const maxRowWidth = 800;
    let rowY = 0, rowX = 0;
    const tagLayout = [];
    
    sortedColors.forEach(([code, count]) => {
        let colorInfo = null;
        for (const brand in window.brandColors) {
            const colors = window.brandColors[brand];
            colorInfo = colors.find(c => c.code === code);
            if (colorInfo) break;
        }
        const tagW = tagStyle.fixedWidth;
        const tagH = statsLineHeight;
        if (rowX + tagW > maxRowWidth && rowX > 0) {
            rowX = 0;
            rowY += tagH + statsGap;
        }
        tagLayout.push({ x: rowX, y: rowY, w: tagW, h: tagH, code, count, colorInfo });
        rowX += tagW + statsGap;
    });
    
    const listWidth = maxRowWidth + padding * 2;
    const titleHeight = 60;
    const listHeight = rowY + statsLineHeight + padding;
    
    canvas.width = (listWidth) * scale;
    canvas.height = (titleHeight + listHeight) * scale;
    ctx.scale(scale, scale);
    
    // 背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, listWidth, titleHeight + listHeight);
    
    // 标题
    ctx.fillStyle = '#333';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('色号与数量统计', padding, 40);
    
    const drawRoundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
            ctx.fill();
            ctx.stroke();
        } else {
            const pi = Math.PI;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arc(x + w - r, y + r, r, -pi/2, pi/2);
            ctx.lineTo(x + w, y + h - r);
            ctx.arc(x + w - r, y + h - r, r, pi/2, pi/2*3);
            ctx.lineTo(x + r, y + h);
            ctx.arc(x + r, y + h - r, r, pi/2*3, pi/2*3 + pi/2);
            ctx.lineTo(x, y + r);
            ctx.arc(x + r, y + r, r, pi, pi*1.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    };
    
    // 绘制标签
    tagLayout.forEach(({ x, y, w, h, code, count, colorInfo }) => {
        const tx = padding + x;
        const ty = titleHeight + y;
        const ts = tagStyle;
        
        // 标签圆角底
        ctx.fillStyle = ts.bgColor;
        ctx.strokeStyle = ts.borderColor;
        ctx.lineWidth = 1;
        drawRoundRect(tx, ty, w, h, ts.borderRadius);
        
        // 色彩格子
        const boxX = tx + ts.paddingH;
        const boxY = ty + (h - ts.colorBoxSize) / 2;
        const bgColor = colorInfo ? '#' + colorInfo.hex : '#ccc';
        ctx.fillStyle = bgColor;
        ctx.fillRect(boxX, boxY, ts.colorBoxSize, ts.colorBoxSize);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY, ts.colorBoxSize, ts.colorBoxSize);
        
        // 色号
        ctx.fillStyle = '#333';
        ctx.font = ts.codeFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(code, boxX + ts.colorBoxSize + ts.gap, ty + h / 2);
        
        // 数量
        ctx.fillStyle = '#666';
        ctx.font = ts.countFont;
        ctx.fillText('× ' + count, boxX + ts.colorBoxSize + ts.gap + ctx.measureText(code).width + ts.gap, ty + h / 2);
    });
    
    const link = document.createElement('a');
    link.download = 'color-legend.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ============================================
// 拖拽调整宽度
// ============================================

function setupResizeHandle() {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    elements.resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = elements.leftPanel.offsetWidth;
        elements.resizeHandle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const diff = e.clientX - startX;
        const newWidth = Math.max(250, Math.min(600, startWidth + diff));
        elements.leftPanel.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            elements.resizeHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// ============================================
// 启动
// ============================================

document.addEventListener('DOMContentLoaded', init);
