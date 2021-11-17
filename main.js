const cw = console.log;

class Size {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    add(size) {
        this.width += size.width;
        this.height += size.height;
        return this;
    }
}

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }
}

class Pos extends Vector {}

class Texture extends Image {
    constructor(src, size) {
        super(100, 100);

        this.loaded = false;
        this.onload = () => this.loaded = true;
        this.src = src;

        if(size) {
            this.width = size.width;
            this.width = size.height;
        }
    }
}

class Canvas {
    constructor(x, y, width, height) {
        const canvas = document.createElement('canvas');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;
        canvas.style.position = 'absolute';
        canvas.style.left = x + 'px';
        canvas.style.top = y + 'px';        
    }

    clear = () => this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    setParent = parent => parent.appendChild(this.canvas);
    drawTexture = (texture, x, y, width, height) => this.ctx.drawImage(texture, x, y, width, height);
}

class Segment {
    constructor(type, pos) {
        this.rail = null;
        this.type = type;
        this.size = this.type.size;
        this.pos = pos;
    }

    render() {
        if(!this.rail)
            throw new Error('Rail object not set.');

        this.rail.drawTexture(this.type.texture, this.pos.x, this.pos.y, this.size.width, this.size.height);
    }
}

class Rail extends Canvas {
    constructor(x, y, width, height) {
        super(x, y, width, height); //create canvas (call constructor of Canvas)
        this.pos = new Pos(x, y);
        this.size = new Size(width, height);
        this.segments = [];
    }

    addSegment(type) {
        let prev = this.segments[this.segments.length - 1];

        let pos = new Pos(0, 0);

        if(type.orientation == 0)
            pos.add(new Pos(0, (prev?.pos?.y || 0) + (prev?.size?.height || 0)));
        else 
            pos.add(new Pos((prev?.pos?.x || 0) + (prev?.size?.width || 0), 0));

        const segment = new Segment(type, pos);
        segment.rail = this;
        this.segments.push(segment);
    }

    render() {
        for(const segment of this.segments)
            segment.render();
    }
}

class Train {
    constructor(size, pos) {
        this.pos = pos;
        this.size = size;
        this.rail = null;
        this.texture = new Texture('./assets/textures/trains/old.png', size);
        this.orientation = 0;
    }

    setRail = rail => this.rail = rail;

    move(v, v2) {
        ([
            () => this.pos.add(new Vector(0, v)), //TO_BOTTOM
            () => this.pos.add(new Vector(v, 0)), //TO_LEFT
            () => this.pos.add(new Vector(v * -1, 0)), //TO_RIGHT
            () => this.pos.add(new Vector(v, v2)), //TO_BOTTOM_LEFT
            () => this.pos.add(new Vector(v * -1, v2 * -1)) //TO_BOTTOM_RIGHT
        ][this.orientation])();
    }

    render() {
        if(!this.rail)
            throw new Error('Rail object not set.');

        this.rail.drawTexture(this.texture, this.pos.x, this.pos.y, this.size.width, this.size.height);
    }
}

Train.Orientation = {
    TO_BOTTOM: 0,
    TO_LEFT: 1,
    TO_RIGHT: 2,
    TO_BOTTOM_LEFT: 3,
    TO_BOTTOM_RIGHT: 4
}

Segment.straight = {
    name: 'straight',
    texture: new Texture('./assets/textures/rail_segments/straight.png'),
    orientation: Train.Orientation.TO_BOTTOM,
    size: new Size(150, 300)
}

Segment.to_right_90_deg = {
    name: 'to_right_90_deg',
    texture: new Texture('./assets/textures/rail_segments/90_deg_to_right.png'),
    orientation: Train.Orientation.TO_RIGHT,
    size: new Size(150, 100)
}

function main() {
    const rail = new Rail(0, 0, 150, 1200);
    rail.setParent(document.body);
    
    rail.addSegment(Segment.straight);
    rail.addSegment(Segment.to_right_90_deg);
    // rail.addSegment(Segment.straight);
    // rail.addSegment(Segment.straight, 300);
    // rail.addSegment(Segment.straight, 300);

    const train = new Train(new Size(150, 300), new Pos(0, 0));
    train.setRail(rail);

    const loop = () => {
        train.move(1);
        rail.clear();
        rail.render();
        train.render();
        window.requestAnimationFrame(loop);
    }

    window.requestAnimationFrame(loop);
}

window.onload = main;