const cw = console.log;

class Size {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    add(size) {
        if(!(size instanceof Size))
            throw new Error('Value must be Size object.');

        this.width += size.width;
        this.height += size.height;
        return this;
    }

    invert() {
        let h = this.height;
        this.height = this.width;
        this.width = h;
        return this;
    }
}

Size.Add = (...arguments) => {
    const size = new Size(0, 0);
    arguments.forEach(arg => size.add(arg));
    return size;
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

class Pos extends Vector {
    constructor(x, y) {
        super(x, y);
    }

    add(v) {
        if(v instanceof Pos) {
            this.x += v.x;
            this.y += v.y;
        } else if(v instanceof Size) {
            this.x += v.width;
            this.y += v.height;
        } else {
            throw new Error('value not instance of Pos or Size');
        }

        return this;
    }

    IsGraterThan = pos => this.x + this.y > pos.x + pos.y;
    IsLowerThan = pos => !this.IsGraterThan(pos);
    IsWithin = (a, b) => this.IsGraterThan(a) && this.IsLowerThan(b);
}

Pos.Add = (...arguments) => {
    const pos = new Pos(0, 0);
    arguments.forEach(arg => pos.add(arg));
    return pos;
}

Pos.Dist = (pos1, pos2) => Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);

class Map {
    constructor() {
        this.items = [];
    }

    set = (from, to, value) => this.items.push({ from, to, value });
    get = pos => {
        for(const item of this.items) {
            if(pos.IsWithin(item.from, item.to))
                return item;
        }
    }

    free = () => this.items = [];
}

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
        this.segmentMap = new Map();
    }

    addSegment(type) {
        let prev = this.segments[this.segments.length - 1];
        let prev_prev = this.segments[this.segments.length - 2];
        let pos = new Pos(0, 0);
        
        if(prev) {
            if(prev.type.orientation == 0)
                pos.add(new Pos(0, prev.pos.y + prev.size.height));
            else {
                pos.add(new Pos(prev.pos.x + prev.size.width, 0));
                pos.add(new Pos(0, prev_prev.pos.y + prev_prev.size.height));
            }
        }
        
        const segment = new Segment(type, pos);
        segment.rail = this;

        if(segment.type.orientation == 0)
            this.segmentMap.set(pos, Pos.Add(pos, this.size), segment);
        else
            this.segmentMap.set(pos, Pos.Add(pos, this.size), segment);

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
        this.inverted = false;
        this.rail = null;
        this.onSegment = null;
        this.textures = {
            vertical: new Texture('./assets/textures/trains/old.png', size),
            horizontal: new Texture('./assets/textures/trains/old_verical_to_right.png', new Size(size.height, size.width))
        }
        
        this.orientation = 0;
    }
    
    //(new Pos(0, 0)).add(this.pos).add((new Size(0, 0)).add(this.size))

    setRail = rail => this.rail = rail;

    move(v, v2) {
        // let p = new Pos(0, 0);
        
        // if(this.pos == p)
        //     p = (new Pos(0, 0)).add(this.size).add(this.pos);
        Pos.Add(this.pos, new Pos(Math.floor(this.pos.width * 0.5), Math.floor(this.pos.height * 0.5)));
        const segment = this.rail.segmentMap.get(this.pos);

        if(segment)
            this.onSegment = segment;

        this.orientation = segment?.type?.orientation || this.orientation;

        ([
            () => this.pos.add(new Pos(0, v)), //TO BOTTOM
            () => this.pos.add(new Pos(v * -1, 0)), //TO LEFT
            () => { //TO RIGHT
                this.pos.add(new Pos(v * 1, 0));
            }, 
            () => this.pos.add(new Pos(v, v2)), //TO BOTTOM LEFT
            () => this.pos.add(new Pos(v * -1, v2 * -1)) //TO BOTTOM RIGHT
        ][this.orientation])();
    }

    render() {
        if(!this.rail)
            throw new Error('Rail object not set.');

        const texture = this.orientation === 0 ? this.textures.vertical : this.textures.horizontal;
        
        if(this.orientation === 0 && !this.inverted) {
        	this.inverted = true;
        	this.size.invert();
        	
        	this.rail.drawTexture(texture, this.pos.x, this.pos.y, this.size.width, this.size.height);
        } else {
        	
        	if(this.inverted && this.orientation !== 0) {
        		this.size.invert();
        		this.inverted = false;
        	}
        	
        	this.rail.drawTexture(texture, this.pos.x, this.pos.y, this.size.height, this.size.width);
        }
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

Segment.straight_horizontal = {
    name: 'straight_horizontal',
    texture: new Texture('./assets/textures/rail_segments/straight_horizontal.png'),
    orientation: Train.Orientation.TO_RIGHT,
    size: new Size(300, 150)
}

Segment.to_right_90_deg = {
    name: 'to_right_90_deg',
    texture: new Texture('./assets/textures/rail_segments/90_deg_to_right.png'),
    orientation: Train.Orientation.TO_RIGHT,
    size: new Size(150, 150)
}

function main() {
    const rail = new Rail(0, 0, 800, 1200);
    rail.setParent(document.body);
    
    rail.addSegment(Segment.straight);
    rail.addSegment(Segment.to_right_90_deg);
    rail.addSegment(Segment.straight_horizontal);
    cw(rail.segmentMap);
    // rail.addSegment(Segment.straight);

    const train = new Train(new Size(150, 300), new Pos(0, 0));
    train.setRail(rail);

    const loop = () => {
        train.move(3);
        rail.clear();
        rail.render();
        train.render();
        window.requestAnimationFrame(loop);
    }

    window.requestAnimationFrame(loop);
}

window.onload = main;