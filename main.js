document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('mainCanvas');
    const watermark = new Watermark(canvas);
    const thumbnailsContainer = document.getElementById('thumbnailsContainer');
    let imageFiles = []; // 存储所有图片文件
    let currentImageIndex = -1; // 当前选中的图片索引

    // 文件上传处理
    document.getElementById('fileInput').addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 清空现有的图片
        imageFiles = [];
        thumbnailsContainer.innerHTML = '';
        
        // 处理每个文件
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const index = imageFiles.length;
                imageFiles.push({
                    file: file,
                    dataUrl: e.target.result
                });

                // 创建缩略图
                const thumbnail = document.createElement('div');
                thumbnail.className = 'thumbnail';
                thumbnail.innerHTML = `
                    <img src="${e.target.result}" alt="thumbnail">
                    <button class="remove-btn" data-index="${index}">×</button>
                `;
                thumbnailsContainer.appendChild(thumbnail);

                // 点击缩略图切换图片
                thumbnail.addEventListener('click', (e) => {
                    if (e.target.classList.contains('remove-btn')) return;
                    selectImage(index);
                });

                // 如果是第一张图片，自动选中
                if (index === 0) {
                    selectImage(0);
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // 选择图片
    async function selectImage(index) {
        if (index < 0 || index >= imageFiles.length) return;
        
        currentImageIndex = index;
        
        // 更新缩略图选中状态
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });

        // 加载并显示图片
        await watermark.draw(imageFiles[index].dataUrl);
        applyCurrentWatermark();
    }

    // 应用当前水印设置
    function applyCurrentWatermark() {
        const textSelect = document.getElementById('textSelect');
        const customText = document.getElementById('customText');
        
        if (textSelect.value === '自定义' && customText.value) {
            watermark.setOptions({ text: customText.value });
        } else {
            watermark.setOptions({ text: textSelect.value });
        }
    }

    // 删除图片
    thumbnailsContainer.addEventListener('click', (e) => {
        if (!e.target.classList.contains('remove-btn')) return;
        
        const index = parseInt(e.target.dataset.index);
        imageFiles.splice(index, index + 1);
        e.target.parentElement.remove();
        
        // 重新编号
        document.querySelectorAll('.remove-btn').forEach((btn, i) => {
            btn.dataset.index = i;
        });

        // 如果删除的是当前选中的图片，选择新的图片
        if (index === currentImageIndex) {
            if (imageFiles.length > 0) {
                selectImage(Math.min(index, imageFiles.length - 1));
            } else {
                currentImageIndex = -1;
                watermark.clear(); // 需要在 Watermark 类中添加 clear 方法
            }
        }
    });

    // 保存当前图片
    document.getElementById('saveBtn').addEventListener('click', async () => {
        if (currentImageIndex === -1) return;
        
        try {
            // 获取原始文件名
            const originalFileName = imageFiles[currentImageIndex].file.name;
            // 构建新文件名：在原文件名的基础上添加"_watermark"
            const newFileName = originalFileName.replace(/(\.[^.]+)$/, '_watermark$1');
            
            // 获取当前图片的 blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.9);
            });

            // 打开文件选择器
            const handle = await window.showSaveFilePicker({
                suggestedName: newFileName,
                types: [{
                    description: 'JPEG图片',
                    accept: {
                        'image/jpeg': ['.jpg', '.jpeg'],
                    },
                }],
            });

            // 创建写入流
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('保存失败:', err);
                alert('保存失败，请重试');
            }
        }
    });

    // 保存所有图片
    document.getElementById('saveAllBtn').addEventListener('click', async () => {
        if (imageFiles.length === 0) return;
        
        try {
            const dirHandle = await window.showDirectoryPicker();
            const currentIndex = currentImageIndex;

            // 保存每张图片
            for (let i = 0; i < imageFiles.length; i++) {
                await selectImage(i);
                
                // 获取原始文件名并构建新文件名
                const originalFileName = imageFiles[i].file.name;
                const newFileName = originalFileName.replace(/(\.[^.]+)$/, '_watermark$1');
                
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/jpeg', 0.9);
                });

                // 创建文件
                const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            }

            // 恢复之前选中的图片
            selectImage(currentIndex);
            alert('所有图片已保存完成！');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('保存失败:', err);
                alert('保存失败，请重试');
            }
        }
    });

    // 旋转按钮
    document.getElementById('rotateBtn').addEventListener('click', () => {
        watermark.rotate();
    });

    // 水印文案选择
    const textSelect = document.getElementById('textSelect');
    const customText = document.getElementById('customText');
    
    textSelect.addEventListener('change', (e) => {
        if (e.target.value === '自定义') {
            customText.style.display = 'inline-block';
            customText.value = watermark.options.text;
        } else {
            customText.style.display = 'none';
            watermark.setOptions({ text: e.target.value });
        }
    });

    customText.addEventListener('input', (e) => {
        watermark.setOptions({ text: e.target.value });
    });

    // 颜色选择器
    const colorPicker = document.getElementById('colorPicker');
    const alphaSlider = document.getElementById('alphaSlider');
    
    function updateColor() {
        const hex = colorPicker.value;
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        const a = parseFloat(alphaSlider.value);
        watermark.setOptions({ 
            fillStyle: `rgba(${r}, ${g}, ${b}, ${a})`
        });
    }

    colorPicker.addEventListener('input', updateColor);
    alphaSlider.addEventListener('input', updateColor);

    // 字体大小和水印尺寸
    document.getElementById('fontSize').addEventListener('input', (e) => {
        watermark.setOptions({ fontSize: parseInt(e.target.value) });
    });

    document.getElementById('watermarkWidth').addEventListener('input', (e) => {
        watermark.setOptions({ watermarkWidth: parseInt(e.target.value) });
    });

    document.getElementById('watermarkHeight').addEventListener('input', (e) => {
        watermark.setOptions({ watermarkHeight: parseInt(e.target.value) });
    });
}); 