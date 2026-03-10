/**
 * 拼豆图像转化工具 - 主应用程序
 * 
 * 功能：
 * 1. 上传图片并预览
 * 2. 将图片转换为拼豆图案
 * 3. 自动匹配品牌色号
 * 4. 支持颜色数量限制
 * 5. 支持格子大小调整
 * 6. 吸管工具修改颜色
 * 7. 下载图案和色号表
 */

// ============================================
// 全局常量定义
// ============================================

// 拼豆颗粒物理尺寸
const BEAD_SIZE_CM = 0.2;  // 每个拼豆颗粒的实际物理尺寸（厘米）
const BEAD_SIZE_PX = 8;    // 每个拼豆颗粒在画布上显示的像素大小

// ============================================
// 全局变量定义
// ============================================

// DOM 元素缓存 - 存储所有需要操作的页面元素
const elements = {
    uploadArea: document.getElementById('uploadArea'),         // 文件上传区域
    imageInput: document.getElementById('imageInput'),         // 文件输入框
    previewContainer: document.getElementById('previewContainer'), // 图片预览容器
    previewImage: document.getElementById('previewImage'),     // 预览图片元素
    brandSelect: document.getElementById('brandSelect'),       // 品牌选择下拉框
    brandInfo: document.getElementById('brandInfo'),           // 品牌信息显示区域
    quality: document.getElementById('quality'),               // 格子数量选择
    colorCount: document.getElementById('colorCount'),         // 颜色数量选择
    convertBtn: document.getElementById('convertBtn'),         // 转换按钮
    loading: document.getElementById('loading'),               // 加载动画容器
    resultArea: document.getElementById('resultArea'),         // 结果显示区域
    resultCanvas: document.getElementById('resultCanvas'),     // 结果画布（用于下载）
    resultGrid: document.getElementById('resultGrid'),         // 结果网格（用于显示）
    resultGridContainer: document.getElementById('resultGridContainer'), // 网格容器
    resultGridWrapper: document.getElementById('resultGridWrapper'), // 网格外包装
    gridSizeSelect: document.getElementById('gridSizeSelect'), // 显示格子大小选择
    colorItems: document.getElementById('colorItems'),         // 颜色图例项目容器
    totalBeads: document.getElementById('totalBeads'),         // 颗粒总数显示
    usedColors: document.getElementById('usedColors'),          // 使用颜色数显示
    downloadCanvas: document.getElementById('downloadCanvas'),   // 下载图案按钮
    downloadLegend: document.getElementById('downloadLegend'),   // 下载色号表按钮
    patternSize: document.getElementById('patternSize'),       // 图案尺寸显示
    pickerTool: document.getElementById('pickerTool'),         // 吸管工具按钮
    colorPicker: document.getElementById('colorPicker'),       // 颜色选择器
    gridLineTool: document.getElementById('gridLineTool'),     // 格子线工具按钮
    gridLineToggle: document.getElementById('gridLineToggle'), // 格子线开关
    resizeHandle: document.getElementById('resizeHandle'),     // 拖拽调整手柄
    leftPanel: document.querySelector('.left-panel'),           // 左侧面板（用于调整宽度）
    mainContent: document.querySelector('.main-content')       // 主内容区域
};

// 状态变量
let uploadedImage = null;        // 上传的图片对象
let usedColorMap = new Map();    // 已使用的颜色映射 Map<code, colorObject>
let colorCountMap = new Map();  // 每种色号使用的颗粒数 Map<code, count>
let gridData = [];              // 二维数组存储网格数据 gridData[y][x] = { code, hex } 或 null
let gridSize = { width: 0, height: 0 };  // 网格尺寸
let pickerMode = false;         // 吸管工具模式开关
let gridLineEnabled = true;     // 格子线显示开关
let currentBrand = 'MARD';      // 当前选择的品牌

// ============================================
// 初始化函数
// ============================================

/**
 * 初始化应用程序
 * - 更新品牌信息显示
 * - 设置事件监听器
 */
function init() {
    updateBrandInfo();      // 显示当前品牌的颜色数量
    setupEventListeners();  // 绑定所有事件监听器
}

/**
 * 更新品牌信息显示
 * 显示当前选中品牌的颜色总数
 */
function updateBrandInfo() {
    const brand = elements.brandSelect.value;              // 获取选中的品牌
    const colors = brandColors[brand];                      // 获取该品牌的颜色列表
    elements.brandInfo.textContent = `${brand} 品牌共有 ${colors.length} 种颜色可选`;
}

// ============================================
// 事件监听器设置
// ============================================

/**
 * 设置所有事件监听器
 * 绑定拖拽、上传、点击等交互事件
 */
function setupEventListeners() {
    // ----- 面板宽度拖拽调整 -----
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
        // 扩大宽度范围：150px - 800px
        const newWidth = Math.max(150, Math.min(800, startWidth + diff));
        elements.leftPanel.style.width = newWidth + 'px';
        
        // 拖拽时重新计算网格缩放
        if (gridData.length > 0) {
            const cellSize = parseInt(elements.gridSizeSelect.value);
            renderResultGrid(cellSize);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            elements.resizeHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    // 触摸设备支持
    elements.resizeHandle.addEventListener('touchstart', (e) => {
        isResizing = true;
        startX = e.touches[0].clientX;
        startWidth = elements.leftPanel.offsetWidth;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        const diff = e.touches[0].clientX - startX;
        const newWidth = Math.max(150, Math.min(800, startWidth + diff));
        elements.leftPanel.style.width = newWidth + 'px';
        
        if (gridData.length > 0) {
            const cellSize = parseInt(elements.gridSizeSelect.value);
            renderResultGrid(cellSize);
        }
    });

    document.addEventListener('touchend', () => {
        isResizing = false;
    });

    // ----- 拖拽上传相关 -----
    elements.uploadArea.addEventListener('dragover', handleDragOver);    // 拖入区域
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);  // 拖离区域
    elements.uploadArea.addEventListener('drop', handleDrop);            // 放置文件
    
    // ----- 文件选择 -----
    elements.imageInput.addEventListener('change', handleImageSelect);   // 文件输入变化
    
    // ----- 设置变更 -----
    elements.brandSelect.addEventListener('change', updateBrandInfo);    // 品牌切换
    
    // 格子大小改变时重新渲染网格
    elements.gridSizeSelect.addEventListener('change', () => {
        if (gridData.length > 0) {
            const cellSize = parseInt(elements.gridSizeSelect.value);
            renderResultGrid(cellSize);
        }
    });

    // ----- 转换和下载 -----
    elements.convertBtn.addEventListener('click', convertImage);         // 转换按钮
    elements.downloadCanvas.addEventListener('click', downloadCanvas);   // 下载图案
    elements.downloadLegend.addEventListener('click', downloadLegend);    // 下载色号表

    // ----- 吸管工具功能 -----
    elements.pickerTool.addEventListener('click', () => {
        pickerMode = !pickerMode;  // 切换模式状态
        // 更新吸管按钮的激活状态
        elements.pickerTool.classList.toggle('active', pickerMode);
        // 更新光标样式
        elements.resultGridWrapper.style.cursor = pickerMode ? 'crosshair' : 'default';
        // 更新网格容器的样式类
        elements.resultGridWrapper.classList.toggle('picker-mode', pickerMode);
    });

    // ----- 格子线开关功能 -----
    elements.gridLineTool.addEventListener('click', () => {
        gridLineEnabled = !gridLineEnabled;
        elements.gridLineTool.classList.toggle('active', gridLineEnabled);
        elements.gridLineToggle.checked = gridLineEnabled;
        updateResultCanvas();
    });

    elements.gridLineToggle.addEventListener('change', () => {
        gridLineEnabled = elements.gridLineToggle.checked;
        elements.gridLineTool.classList.toggle('active', gridLineEnabled);
        updateResultCanvas();
    });

    // 点击格子修改颜色
    elements.resultGrid.addEventListener('click', (e) => {
        if (!pickerMode) return;  // 非吸管模式直接返回
        
        const cell = e.target.closest('.grid-cell');  // 获取点击的格子元素
        if (!cell) return;

        // 计算格子在网格中的位置
        const row = cell.parentElement;
        const cellIndex = Array.from(row.children).indexOf(cell) - 1; // -1 因为第一列是行号
        const rowIndex = Array.from(row.parentElement.children).indexOf(row);

        // 边界检查
        if (rowIndex < 0 || cellIndex < 0) return;
        if (rowIndex >= gridData.length || cellIndex >= gridData[0].length) return;

        // 获取当前的 brandColorList
        const brandColorList = brandColors[currentBrand];

        // 获取原来的颜色并减少计数
        const oldCell = gridData[rowIndex][cellIndex];
        if (oldCell && !oldCell.empty) {
            const oldCount = colorCountMap.get(oldCell.code) || 1;
            colorCountMap.set(oldCell.code, oldCount - 1);
            // 如果计数为0，从 usedColorMap 中移除
            if (colorCountMap.get(oldCell.code) <= 0) {
                usedColorMap.delete(oldCell.code);
            }
        }

        // 获取选中的颜色
        const selectedColor = elements.colorPicker.value;
        const rgb = hexToRgb(selectedColor.replace('#', ''));

        // 找到最接近的拼豆颜色
        const closestColor = findClosestColor(rgb, brandColorList);

        // 更新格子数据
        gridData[rowIndex][cellIndex] = { code: closestColor.code, hex: closestColor.hex, empty: false };

        // 更新颜色映射
        usedColorMap.set(closestColor.code, closestColor);
        const count = colorCountMap.get(closestColor.code) || 0;
        colorCountMap.set(closestColor.code, count + 1);

        // 更新格子显示
        cell.style.backgroundColor = '#' + closestColor.hex;
        cell.style.color = getContrastColor(closestColor.hex);
        cell.textContent = closestColor.code;
        cell.title = closestColor.code;

        // 更新图例和统计
        updateColorLegend(gridSize.width, gridSize.height);
        updateStats(gridSize.width, gridSize.height);

        // 更新下载的 canvas
        updateResultCanvas();
    });
}

// ============================================
// 拖拽上传处理函数
// ============================================

/**
 * 拖拽进入上传区域时触发
 * @param {DragEvent} e - 拖拽事件对象
 */
function handleDragOver(e) {
    e.preventDefault();  // 阻止默认行为（打开文件）
    elements.uploadArea.classList.add('dragover');  // 添加拖拽高亮样式
}

/**
 * 拖拽离开上传区域时触发
 * @param {DragEvent} e - 拖拽事件对象
 */
function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');  // 移除拖拽高亮样式
}

/**
 * 放置文件时触发
 * @param {DragEvent} e - 拖拽事件对象
 */
function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;  // 获取拖拽的文件列表
    if (files.length > 0) {
        handleFile(files[0]);  // 处理第一个文件
    }
}

// ============================================
// 图片文件处理函数
// ============================================

/**
 * 处理文件选择事件
 * @param {Event} e - change 事件对象
 */
function handleImageSelect(e) {
    const file = e.target.files[0];  // 获取选择的文件
    if (file) {
        handleFile(file);  // 处理文件
    }
}

/**
 * 处理上传的文件
 * @param {File} file - 上传的文件对象
 */
function handleFile(file) {
    // 检查文件类型是否为图片
    if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
    }

    // 使用 FileReader 读取文件为 Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;  // 保存图片对象
            elements.previewImage.src = e.target.result;  // 显示预览
            elements.previewContainer.classList.add('active');  // 显示预览容器
            elements.convertBtn.disabled = false;  // 启用转换按钮
        };
        img.onerror = () => {
            alert('图片加载失败，请重试');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);  // 读取文件为 Base64
}

// ============================================
// 颜色处理工具函数
// ============================================

/**
 * 将十六进制颜色转换为 RGB 数组
 * @param {string} hex - 六位十六进制颜色值（如 "FF0000"）
 * @returns {number[]} [r, g, b] 数组
 */
function hexToRgb(hex) {
    const r = parseInt(hex.slice(0, 2), 16);  // 解析红色分量
    const g = parseInt(hex.slice(2, 4), 16);  // 解析绿色分量
    const b = parseInt(hex.slice(4, 6), 16);  // 解析蓝色分量
    return [r, g, b];
}

/**
 * 计算两个 RGB 颜色之间的欧几里得距离
 * 距离越小，颜色越相似
 * @param {number[]} rgb1 - 第一个颜色 [r, g, b]
 * @param {number[]} rgb2 - 第二个颜色 [r, g, b]
 * @returns {number} 颜色距离
 */
function getColorDistance(rgb1, rgb2) {
    return Math.sqrt(
        Math.pow(rgb1[0] - rgb2[0], 2) +  // 红色差值平方
        Math.pow(rgb1[1] - rgb2[1], 2) +  // 绿色差值平方
        Math.pow(rgb1[2] - rgb2[2], 2)    // 蓝色差值平方
    );
}

/**
 * 在品牌颜色列表中找到最接近目标颜色的色号
 * @param {number[]} rgb - 目标 RGB 颜色 [r, g, b]
 * @param {Object[]} brandColorList - 品牌颜色列表
 * @returns {Object} 最接近的颜色对象 { code, hex, rgb }
 */
function findClosestColor(rgb, brandColorList) {
    let minDistance = Infinity;  // 最小距离初始化为无穷大
    let closestColor = null;     // 最接近的颜色

    // 遍历所有品牌颜色，找出距离最小的
    for (const color of brandColorList) {
        const distance = getColorDistance(rgb, color.rgb);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }

    return closestColor;
}

/**
 * 根据背景色获取对比色（黑色或白色）
 * 用于确保文字在彩色背景上可读
 * @param {string} hex - 十六进制颜色值
 * @returns {string} "#333"（深色）或 "#fff"（浅色）
 */
function getContrastColor(hex) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // 计算相对亮度 (公式：0.299*R + 0.587*G + 0.114*B)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // 亮度大于 0.6 用深色文字，否则用浅色文字
    return luminance > 0.6 ? '#333' : '#fff';
}

// ============================================
// 图片转换核心功能
// ============================================

/**
 * 开始转换图片为拼豆图案
 * 显示加载动画，调用实际的转换函数
 */
function convertImage() {
    if (!uploadedImage) {
        alert('请先上传图片');
        return;
    }

    elements.loading.classList.add('active');    // 显示加载动画
    elements.resultArea.classList.remove('active'); // 隐藏结果区域

    // 使用 setTimeout 让浏览器先渲染加载动画
    setTimeout(() => {
        performConversion();  // 执行实际转换
    }, 100);
}

/**
 * 执行实际的图片转换逻辑
 * 1. 创建临时 Canvas 调整图片尺寸
 * 2. 获取像素数据并匹配颜色
 * 3. 应用颜色数量限制
 * 4. 渲染结果网格
 */
function performConversion() {
    const brand = elements.brandSelect.value;      // 获取选中品牌
    currentBrand = brand;                          // 更新当前品牌变量
    const brandColorList = brandColors[brand];      // 获取品牌颜色列表
    const quality = parseFloat(elements.quality.value); // 获取格子数量设置

    const canvas = elements.resultCanvas;           // 获取结果画布
    const ctx = canvas.getContext('2d');            // 获取 2D 绘图上下文

    // 用户直接选择52的倍数作为格子数量
    const gridCount = parseInt(quality);

    // 保持原始图片比例，计算实际宽度和高度
    const aspectRatio = uploadedImage.width / uploadedImage.height;
    let finalWidth, finalHeight;

    // 根据宽高比计算最终尺寸
    if (aspectRatio >= 1) {
        // 宽图：以 gridCount 为宽度
        finalWidth = gridCount;
        finalHeight = Math.round(gridCount / aspectRatio);
        // 确保高度也是52的倍数
        finalHeight = Math.round(finalHeight / 52) * 52;
        finalHeight = Math.max(52, finalHeight);
    } else {
        // 高图：以 gridCount 为高度
        finalHeight = gridCount;
        finalWidth = Math.round(gridCount * aspectRatio);
        // 确保宽度也是52的倍数
        finalWidth = Math.round(finalWidth / 52) * 52;
        finalWidth = Math.max(52, finalWidth);
    }

    // 检查尺寸是否有效
    if (finalWidth <= 0 || finalHeight <= 0) {
        alert('图片尺寸太小，请选择更大的图片');
        elements.loading.classList.remove('active');
        return;
    }

    // 创建临时 Canvas 用于调整图片尺寸
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = finalWidth;
    tempCanvas.height = finalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(uploadedImage, 0, 0, finalWidth, finalHeight);

    // 获取像素数据
    const imageData = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
    const pixels = imageData.data;

    // 清空之前的数据
    usedColorMap.clear();
    colorCountMap.clear();
    gridData = [];

    // 第一遍：转换所有像素并统计颜色使用次数
    const tempColorCounts = new Map();
    for (let y = 0; y < finalHeight; y++) {
        gridData[y] = [];
        for (let x = 0; x < finalWidth; x++) {
            const i = (y * finalWidth + x) * 4;  // 像素在数组中的索引
            const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];  // RGB 值
            const alpha = pixels[i + 3];  // 透明度

            // 处理透明像素
            if (alpha < 128) {
                gridData[y][x] = { code: '', hex: 'FFFFFF', empty: true };
            } else {
                // 找到最接近的品牌颜色
                const closestColor = findClosestColor(rgb, brandColorList);
                const count = tempColorCounts.get(closestColor.code) || 0;
                tempColorCounts.set(closestColor.code, count + 1);
                gridData[y][x] = { code: closestColor.code, hex: closestColor.hex, empty: false };
            }
        }
    }

    // 根据用户选择的颜色数量限制颜色
    const maxColors = parseInt(elements.colorCount.value);
    let limitedColors = [];

    if (maxColors > 0 && tempColorCounts.size > maxColors) {
        // 按使用次数排序，取前 N 个颜色
        limitedColors = [...tempColorCounts.entries()]
            .sort((a, b) => b[1] - a[1])  // 按计数降序排序
            .slice(0, maxColors)           // 取前 N 个
            .map(([code]) => code);        // 只保留色号

        // 第二遍：重新映射像素到限制的颜色
        for (let y = 0; y < finalHeight; y++) {
            for (let x = 0; x < finalWidth; x++) {
                if (gridData[y][x].empty) continue;

                const currentCode = gridData[y][x].code;
                if (!limitedColors.includes(currentCode)) {
                    // 找到限制颜色中最接近的颜色
                    const currentHex = gridData[y][x].hex;
                    const currentRgb = hexToRgb(currentHex);
                    const closestLimited = findClosestColor(
                        currentRgb, 
                        brandColorList.filter(c => limitedColors.includes(c.code))
                    );
                    gridData[y][x] = { code: closestLimited.code, hex: closestLimited.hex, empty: false };
                }
            }
        }
    }

    // 重新统计最终使用的颜色
    for (let y = 0; y < finalHeight; y++) {
        for (let x = 0; x < finalWidth; x++) {
            if (gridData[y][x].empty) continue;
            const code = gridData[y][x].code;
            usedColorMap.set(code, brandColorList.find(c => c.code === code));
            const count = colorCountMap.get(code) || 0;
            colorCountMap.set(code, count + 1);
        }
    }

    // 保存网格尺寸
    gridSize = { width: finalWidth, height: finalHeight };
    
    // 渲染结果
    const displayCellSize = parseInt(elements.gridSizeSelect.value);
    renderResultGrid(displayCellSize);
    updateColorLegend(finalWidth, finalHeight);
    updateStats(finalWidth, finalHeight);

    // 为下载用绘制 canvas（小格+色块，不写字以保持清晰）
    const beadSize = BEAD_SIZE_PX;
    canvas.width = finalWidth * beadSize;
    canvas.height = finalHeight * beadSize;
    for (let y = 0; y < finalHeight; y++) {
        for (let x = 0; x < finalWidth; x++) {
            const cell = gridData[y][x];
            ctx.fillStyle = '#' + cell.hex;
            ctx.fillRect(x * beadSize, y * beadSize, beadSize, beadSize);
            
            // 根据开关决定是否绘制格子线
            if (gridLineEnabled) {
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x * beadSize, y * beadSize, beadSize, beadSize);
            }
        }
    }

    // 隐藏加载动画，显示结果
    elements.loading.classList.remove('active');
    elements.resultArea.classList.add('active');
}

// ============================================
// 结果渲染函数
// ============================================

/**
 * 渲染结果网格（HTML 表格形式显示）
 * @param {number} cellSize - 格子显示大小（像素）
 */
function renderResultGrid(cellSize = 32) {
    const { width, height } = gridSize;
    
    // 创建表格元素
    const table = document.createElement('table');
    table.className = 'bead-grid-table';
    table.style.setProperty('--cell-size', cellSize + 'px');

    // 创建表头（列号）
    const thead = document.createElement('thead');
    let headerRow = '<tr><th class="grid-corner"></th>';
    for (let c = 1; c <= width; c++) {
        headerRow += `<th class="grid-col-num">${c}</th>`;
    }
    headerRow += '</tr>';
    thead.innerHTML = headerRow;
    table.appendChild(thead);

    // 创建表体（网格数据）
    const tbody = document.createElement('tbody');
    for (let y = 0; y < height; y++) {
        let rowHtml = `<td class="grid-row-num">${y + 1}</td>`;
        for (let x = 0; x < width; x++) {
            const cell = gridData[y][x];
            const textColor = getContrastColor(cell.hex);
            const bg = cell.empty ? '#f5f5f5' : '#' + cell.hex;
            const code = cell.empty ? '' : cell.code;
            rowHtml += `<td class="grid-cell" style="background-color:${bg};color:${textColor}" title="${code}">${code}</td>`;
        }
        const tr = document.createElement('tr');
        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // 清空并添加新表格
    elements.resultGrid.innerHTML = '';
    elements.resultGrid.appendChild(table);

    // 自动计算缩放以完整显示全图
    setTimeout(() => {
        const container = elements.resultGridContainer;
        const grid = elements.resultGrid;
        const containerRect = container.parentElement.getBoundingClientRect();
        const containerWidth = containerRect.width - 24; // 减去 padding
        const containerHeight = containerRect.height - 24;

        const gridWidth = table.offsetWidth;
        const gridHeight = table.offsetHeight;

        const scaleX = containerWidth / gridWidth;
        const scaleY = containerHeight / gridHeight;
        const scale = Math.min(scaleX, scaleY, 1); // 不超过100%

        if (scale > 0 && scale < 1) {
            grid.style.transform = `scale(${scale})`;
            grid.style.transformOrigin = 'center center';
        } else {
            grid.style.transform = 'scale(1)';
            grid.style.transformOrigin = 'center center';
        }
    }, 100);
}

/**
 * 更新颜色图例显示
 * @param {number} gridWidth - 网格宽度
 * @param {number} gridHeight - 网格高度
 */
function updateColorLegend(gridWidth, gridHeight) {
    elements.colorItems.innerHTML = '';  // 清空现有内容

    // 按使用次数降序排序颜色
    const sortedColors = Array.from(usedColorMap.values())
        .sort((a, b) => (colorCountMap.get(b.code) || 0) - (colorCountMap.get(a.code) || 0));

    // 为每个颜色创建图例项
    sortedColors.forEach(color => {
        const count = colorCountMap.get(color.code) || 0;
        const item = document.createElement('div');
        item.className = 'color-item';
        item.innerHTML = `
            <div class="color-swatch" style="background-color: #${color.hex}"></div>
            <div class="color-item-text">
                <span class="color-code">${color.code}</span>
                <span class="color-count">${count}</span>
            </div>
        `;
        elements.colorItems.appendChild(item);
    });
}

/**
 * 更新统计信息显示
 * @param {number} gridWidth - 网格宽度
 * @param {number} gridHeight - 网格高度
 */
function updateStats(gridWidth, gridHeight) {
    // 颗粒总数
    elements.totalBeads.textContent = (gridWidth * gridHeight).toLocaleString();
    // 使用颜色数
    elements.usedColors.textContent = usedColorMap.size;
    // 图案尺寸（0.2cm per bead）
    const sizeCm = `${(gridWidth * 0.2).toFixed(1)} × ${(gridHeight * 0.2).toFixed(1)} cm`;
    elements.patternSize.textContent = sizeCm;
}

/**
 * 更新下载用的 Canvas
 * 在吸管工具修改颜色后调用，同步更新 Canvas 数据
 */
function updateResultCanvas() {
    const canvas = elements.resultCanvas;
    const ctx = canvas.getContext('2d');
    const beadSize = BEAD_SIZE_PX;

    canvas.width = gridSize.width * beadSize;
    canvas.height = gridSize.height * beadSize;

    // 重绘所有格子
    for (let y = 0; y < gridSize.height; y++) {
        for (let x = 0; x < gridSize.width; x++) {
            const cell = gridData[y][x];
            ctx.fillStyle = '#' + cell.hex;
            ctx.fillRect(x * beadSize, y * beadSize, beadSize, beadSize);
            
            // 根据开关决定是否绘制格子线
            if (gridLineEnabled) {
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x * beadSize, y * beadSize, beadSize, beadSize);
            }
        }
    }
}

// ============================================
// 下载功能函数
// ============================================

/**
 * 下载拼豆图案为 PNG 图片
 */
function downloadCanvas() {
    const link = document.createElement('a');
    link.download = 'bead-pattern.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
}

/**
 * 下载色号表为文本文件
 * 包含色号、十六进制值和 RGB 值
 */
function downloadLegend() {
    const brand = elements.brandSelect.value;
    // 按色号字母顺序排序
    const sortedColors = Array.from(usedColorMap.values()).sort((a, b) => {
        return a.code.localeCompare(b.code, 'zh');
    });

    // 构建文本内容
    let legendText = `${brand} 色号表\n`;
    legendText += '================\n\n';

    sortedColors.forEach(color => {
        legendText += `${color.code}\t#${color.hex}\tRGB(${color.rgb.join(', ')})\n`;
    });

    // 创建并下载文件
    const blob = new Blob([legendText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${brand}-色号表.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
}

// ============================================
// 应用程序入口
// ============================================

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
