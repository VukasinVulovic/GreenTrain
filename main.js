let NUM = 0;
let AFTER = null;

const cw = console.log;
const stop = (after, msg) => {
    if(after && AFTER == null)
        AFTER = after;

    if(!after || NUM++ == after) {
        cw(msg);
        throw new Error('BREAKPOINT');
    }
}

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

    invert = () => [this.height, this.width] = [this.width, this.height];
    multipy(vector) {
        this.width = Math.round(vector.x * this.width);
        this.height = Math.round(vector.y * this.height);
        return this;
    }
}

Size.Add = (...arguments) => {
    const size = new Size(0, 0);
    arguments.forEach(arg => size.add(arg));
    return size;
}

Size.Multipy = (...arguments) => {
    const size = arguments.shift();
    arguments.forEach(arg => size.multipy(arg));
    return size;
}

Size.Invert = s => new Size(s.height, s.width);

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

    multipy(vector) {
        this.x = Math.round(vector.x * this.x);
        this.y = Math.round(vector.y * this.y);
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

Pos.Multipy = (...arguments) => {
    const pos = arguments.shift();
    arguments.forEach(arg => pos.multipy(arg));
    return pos;
}

Pos.Dist = (pos1, pos2) => Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);

class Range {
    constructor(min, max) {
        this.min = min;
        this.max = max; 
    }

    Overlaps = range => (((range.x >= this.min.x) && (range.y >= this.min.y)) && ((range.x <= this.max.x) && (range.y <= this.max.y)));
}

class LinearMap {
    constructor() {
        this.items = [];
    }

    set = (range, value) => this.items.push({ range, value });
    
    get = range => this.items.filter(v => v.range.Overlaps(range)).map(v => v.value);

    // free = pos => delete this.items[`@${pos.x}_${pos.y}`];
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
        this.segmentMap = new LinearMap();
    }

    addSegment(type) {
        let prev = this.segments[this.segments.length - 1];
        let pos = new Pos((prev?.pos?.x || 0), (prev?.pos?.y || 0));

        if(prev) {
            switch(prev.type.orientation) {
                case 0:
                    pos.add(new Size(0, prev.size.height));
                    break;
                
                case 1:
                case 2:
                case 4:
                    pos.add(new Size(prev.size.width, 0));
                    break;

                default:
                    throw new Error('OwO');
            }
        }
        
        const segment = new Segment(type, pos);
        segment.rail = this;

        this.segmentMap.set(new Range(pos, Pos.Add(pos, segment.size)), segment);
        this.segments.push(segment);
    }

    render() {
        for(const segment of this.segments)
            segment.render();
    }
}

class Train {
    constructor(size, pos) {
        this.orientations = {
            TO_BOTTOM: 0,
            TO_LEFT: 1,
            TO_RIGHT: 2,
            TO_BOTTOM_LEFT: 3,
            TO_BOTTOM_RIGHT: 4
        }

        this.ditanceTraveled = 0;
        this.pos = pos;
        this.size = size;
        this.inverted = false;
        this.rail = null;
        this.onSegment = null;
        this.textures = {
            vertical: new Texture('./assets/textures/trains/old.png', size),
            horizontal: new Texture('./assets/textures/trains/old_verical_to_right.png', new Size(size.height, size.width))
        }
        
        this.brake = false;
        this.orientation = 0;
    }
    
    setRail = rail => this.rail = rail;

    move(v) {
        let segment = this.rail.segmentMap.get(this.pos);

        // cw(this.pos);
        // cw(this.rail.segmentMap);
        // cw(segment);
        // stop(27, [ segment, this.rail.segmentMap, this.pos ]);

        segment = segment.at(-1);

        if(segment)
            this.onSegment = segment;

        if(segment?.type?.orientation !== undefined)
            this.orientation = segment?.type?.orientation;

        if(this.brake)
            return;

        ([
            () => this.pos.add(new Pos(0, v)), //TO BOTTOM
            () => this.pos.add(new Pos(v * -1, 0)), //TO LEFT
            () => this.pos.add(new Pos(v * 1, 0)), //TO RIGHT
            () => this.pos.add(new Pos(v, v)), //TO BOTTOM LEFT
            () => this.pos.add(new Pos(v, 0)) //TO BOTTOM RIGHT
        ][this.orientation])();

        if(this.rail.segments.indexOf(segment) == this.rail.segments.length-1)
            this.brake = true;

        this.ditanceTraveled += Math.sign(v);
    }

    render() {
        if(!this.rail)
            throw new Error('Rail object not set.');

        const texture = (this.orientation === this.orientations.TO_BOTTOM) ? this.textures.vertical : this.textures.horizontal;

        if((this.orientation === this.orientations.TO_BOTTOM) && !this.inverted) {
        	this.inverted = true;
        	this.size.invert();
            
        	this.rail.drawTexture(texture, this.pos.x, this.pos.y, this.size.width, this.size.height);
        } else {
        	if(this.inverted && this.orientation !== this.orientations.TO_BOTTOM) {
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
    size: new Size(65, 130)
}

Segment.straight_horizontal = {
    name: 'straight_horizontal',
    texture: new Texture('./assets/textures/rail_segments/straight_horizontal.png'),
    orientation: Train.Orientation.TO_RIGHT,
    size: Size.Invert(Segment.straight.size)
}

Segment.to_right_90_deg = {
    name: 'to_right_90_deg',
    texture: new Texture('./assets/textures/rail_segments/90_deg_to_right.png'),
    orientation: Train.Orientation.TO_BOTTOM_RIGHT, //TO_RIGHT
    size: new Size(Segment.straight.size.width, Segment.straight.size.width)
}

Segment.from_left_90_deg = {
    name: 'from_left_90_deg',
    texture: new Texture('./assets/textures/rail_segments/90_deg_from_left.png'),
    orientation: Train.Orientation.TO_BOTTOM,
    size: new Size(Segment.straight.size.width, Segment.straight.size.width)
}

function main() {
}
const rail = new Rail(0, 0, window.innerWidth, window.innerHeight * 4);
rail.setParent(document.body);

const createSegments = () => {
    rail.addSegment(Segment.straight);
    rail.addSegment(Segment.straight);
    rail.addSegment(Segment.straight);
    rail.addSegment(Segment.to_right_90_deg);
    rail.addSegment(Segment.straight_horizontal);
    rail.addSegment(Segment.straight_horizontal);

    
    // rail.addSegment(Segment.straight_horizontal);
    rail.addSegment(Segment.from_left_90_deg);
    rail.addSegment(Segment.straight);
    rail.addSegment(Segment.to_right_90_deg);
    rail.addSegment(Segment.straight_horizontal);
}

createSegments();

const train = new Train(Size.Add(Segment.straight.size), new Pos(0, 0));
train.setRail(rail);

const loop = () => {
    train.move(10);

    // scrollTo(train.pos.x / 2, train.pos.y / 2);
    rail.clear();
    rail.render();
    train.render();
    
    window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);

window.onload = main;