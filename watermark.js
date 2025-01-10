function canvasTextAutoLine(ctx, width, str, initX, initY, lineHeight = 20) {
    var lineWidth = 0;
    var canvasWidth = width;
    var lastSubStrIndex = 0;
    for (let i = 0; i < str.length; i++) {
        lineWidth += ctx.measureText(str[i]).width;

        if (lineWidth > canvasWidth - initX) {
            ctx.fillText(str.substring(lastSubStrIndex, i), initX, initY);
            initY += lineHeight;
            lineWidth = 0;
            lastSubStrIndex = i;
        }
        if (i === str.length - 1) {
            ctx.fillText(str.substring(lastSubStrIndex, i + 1), initX, initY);
        }
    }
}

class Watermark {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.img = null;
        this.step = 0;
        this.watermarkCanvas = document.createElement('canvas');
        this.img_width = 0;
        this.img_height = 0;
        this.userOptions = {};
    }

    getOptions() {
        const defaultOptions = {
            text: "仅用于办理住房公积金，他用无效。",
            fontSize: 23,
            fillStyle: "rgba(0, 0, 0, 0.4)",
            watermarkWidth: 280,
            watermarkHeight: 180
        };
        const options = { ...defaultOptions, ...this.userOptions };
        
        if (options.fontSize < 10) {
            options.fontSize = 10;
        } else {
            options.fontSize = parseInt(options.fontSize, 10);
        }
        if (options.watermarkWidth < 100) {
            options.watermarkWidth = 100;
        }
        if (options.watermarkHeight < 100) {
            options.watermarkHeight = 100;
        }
        return options;
    }

    createWatermarkCanvas() {
        const { text, fontSize, fillStyle, watermarkWidth, watermarkHeight } = this.getOptions();
        const rotate = 20;
        const wctx = this.watermarkCanvas.getContext('2d');
        const { sqrt, pow, sin, tan } = Math;

        this.watermarkCanvas.width = sqrt(pow(watermarkWidth, 2) + pow(watermarkHeight, 2));
        this.watermarkCanvas.height = watermarkHeight;

        wctx.font = `${fontSize}px 黑体`;

        // 文字倾斜角度
        wctx.rotate(-rotate * Math.PI / 180);
        wctx.fillStyle = fillStyle;
        
        const Y = parseInt(sin(rotate * Math.PI / 180) * watermarkWidth, 10);
        const X = -parseInt(Y / tan((90 - rotate) * Math.PI / 180), 10);
        
        canvasTextAutoLine(wctx, watermarkWidth, text, X + 10, Y + fontSize + 20, fontSize * 1.4);
    }

    drawImage() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        switch (this.step) {
            default:
            case 0:
                this.canvas.width = this.img_width;
                this.canvas.height = this.img_height;
                this.ctx.drawImage(this.img, 0, 0, this.img_width, this.img_height);
                break;
            case 1:
                this.canvas.width = this.img_height;
                this.canvas.height = this.img_width;
                this.ctx.save();
                this.ctx.rotate(90 * Math.PI / 180);
                this.ctx.drawImage(this.img, 0, -this.img_height, this.img_width, this.img_height);
                this.ctx.restore();
                break;
            case 2:
                this.canvas.width = this.img_width;
                this.canvas.height = this.img_height;
                this.ctx.save();
                this.ctx.rotate(180 * Math.PI / 180);
                this.ctx.drawImage(this.img, -this.img_width, -this.img_height, this.img_width, this.img_height);
                this.ctx.restore();
                break;
            case 3:
                this.canvas.width = this.img_height;
                this.canvas.height = this.img_width;
                this.ctx.save();
                this.ctx.rotate(270 * Math.PI / 180);
                this.ctx.drawImage(this.img, -this.img_width, 0, this.img_width, this.img_height);
                this.ctx.restore();
                break;
        }
    }

    addWatermark() {
        // 平铺--重复小块的canvas
        var pat = this.ctx.createPattern(this.watermarkCanvas, "repeat");
        this.ctx.fillStyle = pat;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    _draw() {
        this.drawImage();
        this.addWatermark();
    }

    async draw(dataURL) {
        this.step = 0;
        this.img = new Image();
        
        await new Promise(resolve => {
            this.img.onload = () => {
                this.img_width = this.img.width;
                const max = 2000;
                if (this.img_width > max) {
                    this.img_width = max;
                    this.img_height = max * this.img.height / this.img.width;
                } else {
                    this.img_height = this.img.height;
                }
                this._draw();
                resolve();
            };
            this.img.src = dataURL;
        });
    }

    rotate() {
        if (!this.img) return;
        this.step >= 3 ? (this.step = 0) : this.step++;
        this._draw();
    }

    save() {
        if (!this.img) return;
        const link = document.createElement('a');
        link.download = 'watermark.jpg';
        link.href = this.canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    }

    setOptions(obj = {}) {
        this.userOptions = obj;
        this.createWatermarkCanvas();
        if (!this.img) return;
        this._draw();
    }

    clear() {
        this.img = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
} 