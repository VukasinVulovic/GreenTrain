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


Math.clamp = (value, min, max) => {
    if(value < min)
        value = min;

    if(value > max)
        value = max;

    return value;
}

Math.map = (value, imin, imax, omin, omax) => Math.clamp(((value - imin) * (omax - omin) / (imax - imin) + omin), omin, omax);

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
    const pos = Pos.Add(arguments.shift());
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

    drawTexture(texture, x, y, rot_deg, width, height) {
        const pos = new Pos(x, y);
        // this.posPoint('red', pos.x, pos.y);

        if(rot_deg !== 0) { //if rotation is needed
            this.ctx.save();
    
            this.ctx.setTransform(1, 0, 0, 1, pos.x, pos.y); //set transform to 2d
            this.ctx.rotate(rot_deg * (Math.PI / 180)); //convert degrees to radians and rotate canvas
    
            this.ctx.drawImage(texture, -width * 0.5, -height * 0.5, width, height); //draw on canvas
    
            this.ctx.restore(); //return to defaults
            this.ctx.resetTransform();
        } else {
            pos.add(new Pos(-0.5 * width, -0.5 * height)); //set position to center
            this.ctx.drawImage(texture, pos.x, pos.y, width, height);
        }
    }

    posPoint(color, x, y) {
        this.ctx.fillStyle = color;
        this.ctx.arc(x, y, 7, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.closePath();
    }
}

const Orientation = {
    TO_BOTTOM: 1,
    FROM_TOP_TO_RIGHT: 2,
    FROM_LEFT_TO_RIGHT: 3,
    FROM_LEFT_TO_TOP: 4,
    TO_TOP: 5,
    FROM_BOTTOM_TO_RIGHT: 6,
    FROM_LEFT_TO_BOTTOM: 7,
    FROM_TOP_TO_LEFT: 8,
    FROM_RIGHT_TO_TOP: 9,
    FROM_RIGHT_TO_LEFT: 10,
    FROM_RIGHT_TO_BOTTOM: 11
}

class Segment {
    constructor(type, pos) {
        this.rail = null;
        this.type = type;
        this.size = this.type.size;
        this.pos = pos;
        this.orientation = type.orientation;
        this.hide_train = !!type.hide_train;
    }

    render() {
        if(!this.rail)
            throw new Error('Rail object not set.');

        this.rail.drawTexture(this.type.texture, this.pos.x, this.pos.y, 0, this.size.width, this.size.height);
    }
}

class Rail extends Canvas {
    constructor(x, y, width, height) {
        super(x, y, width, height); //create canvas (call constructor of Canvas)
        this.pos = new Pos(x, y);
        this.size = new Size(width, height);
        this.segment_map = new LinearMap();
        this.segments = [];
    }

    addSegment(type) {
        const prev = this.segments?.at(-1); //previous segment
        const pos = Pos.Add(prev?.pos || (this.pos, new Size(type.size.width * 0.5, type.size.height * 0.5))); //if no previous segment, use rail position + half size
        const offset = new Pos(0, 0);

        if(prev) { //if there is a previous segment
            switch(prev.orientation) { //set offset based on previous segment's rotation
                case Orientation.TO_BOTTOM:
                case Orientation.FROM_LEFT_TO_BOTTOM:
                case Orientation.FROM_RIGHT_TO_BOTTOM:
                    pos.add(new Pos(0, (prev.size.height + type.size.height) * 0.5));
                    break;

                case Orientation.FROM_TOP_TO_RIGHT:
                case Orientation.FROM_LEFT_TO_RIGHT:
                    pos.add(new Pos((prev.size.width + type.size.width) * 0.5, 0));
                    break;

                case Orientation.FROM_TOP_TO_LEFT:
                case Orientation.FROM_RIGHT_TO_LEFT:
                    pos.add(new Pos((prev.size.width + type.size.width) * -0.5, 0));
                    break;

                case Orientation.FROM_RIGHT_TO_TOP:
                case Orientation.TO_TOP:
                    pos.add(new Pos(0, (prev.size.height + type.size.height) * -0.5));
                    break;
                default:
                    throw new Error('Unknown orientation: ' + prev.orientation);
            }
        }
        
        pos.add(offset); //add offset to position
        
        const segment = new Segment(type, pos);
        segment.rail = this; //set rail
        
        const range = new Range(pos, pos); //set range (min pos, max pos) (train top)
        this.segment_map.set(range, segment); //add segment to linear map
        this.segments.push(segment); //add segment to list
    }

    render() { //render all segments from array
        for(const segment of this.segments)
            segment.render();
    }
}

class Train {
    constructor(size) {
        this.ditance_traveled = 0;
        this.pos = new Pos(0, 0);
        this.size = size;
        this.inverted = false;
        this.rail = null;
        this.on_segment = null;
        this.prev_segment = null;
        this.textures = {
            old: new Texture('./assets/textures/trains/old.png', size)
        }
        
        this.texture = this.textures.old;
        this.orientation = Orientation.TO_BOTTOM;
        this.prev_rotated = 0;
    }
    
    setRail(rail) {
        this.rail = rail;
        this.pos = Pos.Add(rail?.segments[0]?.pos) || new Pos(0, 0);
        this.on_segment = rail?.segments[0];
    }

    move(v) {        
        const segment = this.rail.segment_map.get(this.pos).at(-1); //get segemnts of current position

        if(this.rail?.segments?.at(-1) == segment) //if last segment, don't move
            return;

        this.on_segment = segment ? segment : this.on_segment; //if segment not chaged or no segment

        if(this.on_segment) { //if train is on segment
            switch(this.on_segment.orientation) { //set offset based on previous segment's rotation
                case Orientation.TO_BOTTOM:
                case Orientation.FROM_LEFT_TO_BOTTOM:
                case Orientation.FROM_RIGHT_TO_BOTTOM:
                    this.pos.add(new Pos(0, v));
                    break;
    
                case Orientation.FROM_TOP_TO_RIGHT:
                case Orientation.FROM_LEFT_TO_RIGHT:
                    this.pos.add(new Pos(v, 0));                        
                    break;
    
                case Orientation.FROM_TOP_TO_LEFT:
                case Orientation.FROM_RIGHT_TO_LEFT:
                    this.pos.add(new Pos(v * -1, 0));
                    break;
    
                case Orientation.FROM_RIGHT_TO_TOP:
                case Orientation.TO_TOP:
                    this.pos.add(new Pos(0, v * -1));
                    break;

                default:
                    throw new Error('Unknown orientation: ' + this.on_segment.orientation);
            }

            this.orientation = this.on_segment.orientation;
        }

        this.ditance_traveled += Math.sign(v); //add to distance
    }

    calcDiff(curr_angle, to, dir) {
        const diff = (Math.abs(this.on_segment.pos.x - this.pos.x) + Math.abs(this.on_segment.pos.y - this.pos.y));
        return (Math.floor(Math.map(diff, curr_angle, this.on_segment.size.width, curr_angle, to))) * dir;
    }

    render() {
        if(!this.rail)
            throw new Error('Rail object not set.');

        let rotation = 0;

        switch(this.orientation) { //set rotation based on train rotation
            case Orientation.FROM_LEFT_TO_BOTTOM:
                rotation = this.calcDiff(-90, 0, 1);
                break;

            case Orientation.FROM_RIGHT_TO_BOTTOM:
                rotation = this.calcDiff(-90, 0, -1);
                break;

            case Orientation.FROM_TOP_TO_RIGHT:
                rotation = this.calcDiff(-90, 90, -1);
                break;

            case Orientation.FROM_LEFT_TO_RIGHT:
                rotation = -90;
                break;

            case Orientation.FROM_TOP_TO_LEFT:
                rotation = this.calcDiff(-90, 90, 1);
                break;

            case Orientation.FROM_RIGHT_TO_LEFT:
                rotation = 90;
                break;

            case Orientation.FROM_RIGHT_TO_TOP:
                rotation = this.calcDiff(-360, 180, 1);
                break;

            case Orientation.TO_TOP:
                rotation = 180;
                break;
        }

        this.rail.drawTexture(this.texture, this.pos.x, this.pos.y, rotation, this.size.width, this.size.height);
    }
}

Segment.Straight = {
    name: 'straight',
    texture: new Texture('./assets/textures/rail_segments/straight.png'),
    orientation: Orientation.TO_BOTTOM,
    size: new Size(90, 130)
}

Segment.StraightToTop = {
    name: 'straight to top',
    texture: new Texture('./assets/textures/rail_segments/straight.png'),
    orientation: Orientation.TO_TOP,
    size: new Size(90, 130)
}

Segment.FromTopToRight = {
    name: 'from top to right',
    texture: new Texture('./assets/textures/rail_segments/from_top_to_right.png'),
    orientation: Orientation.FROM_TOP_TO_RIGHT,
    size: new Size(90, 90)
}

Segment.StraightLeftToRight = {
    name: 'straight horizontal to right',
    texture: new Texture('./assets/textures/rail_segments/straight_horizontal.png'),
    orientation: Orientation.FROM_LEFT_TO_RIGHT,
    size: new Size(130, 90)
}

Segment.StraightRightToLeft = {
    name: 'straight horizontal to left',
    texture: new Texture('./assets/textures/rail_segments/straight_horizontal.png'),
    orientation: Orientation.FROM_RIGHT_TO_LEFT,
    size: new Size(130, 90)
}

Segment.FromLeftToBottom = {
    name: 'from left to bottom',
    texture: new Texture('./assets/textures/rail_segments/from_left_to_bottom.png'),
    orientation: Orientation.FROM_LEFT_TO_BOTTOM,
    size: new Size(90, 90)
}

Segment.FromLeftToTop = {
    name: 'from left to top',
    texture: new Texture('./assets/textures/rail_segments/from_left_to_top.png'),
    orientation: Orientation.FROM_LEFT_TO_TOP,
    size: new Size(90, 90)
}

Segment.FromBottomToRight = {
    name: 'from bottom to right',
    texture: new Texture('./assets/textures/rail_segments/from_bottom_to_right.png'),
    orientation: Orientation.FROM_BOTTOM_TO_RIGHT,
    size: new Size(90, 90)
}

Segment.FromLeftToBottom = {
    name: 'from left to bottom',
    texture: new Texture('./assets/textures/rail_segments/from_left_to_bottom.png'),
    orientation: Orientation.FROM_LEFT_TO_BOTTOM,
    size: new Size(90, 90)
}

Segment.FromTopToLeft = {
    name: 'from top to left',
    texture: new Texture('./assets/textures/rail_segments/from_left_to_top.png'),
    orientation: Orientation.FROM_TOP_TO_LEFT,
    size: new Size(90, 90)
}

Segment.FromRightToTop = {
    name: 'from right to top',
    texture: new Texture('./assets/textures/rail_segments/from_top_to_right.png'),
    orientation: Orientation.FROM_RIGHT_TO_TOP,
    size: new Size(90, 90)
}

Segment.FromRightToBottom = {
    name: 'from right to bottom',
    texture: new Texture('./assets/textures/rail_segments/from_bottom_to_right.png'),
    orientation: Orientation.FROM_RIGHT_TO_BOTTOM,
    size: new Size(90, 90)
}

Segment.Tunnel = {
    name: 'tunnel',
    texture: new Texture('./assets/textures/rail_segments/tunnel_straight.png'),
    orientation: Orientation.TO_BOTTOM,
    size: new Size(90, 130),
    hide_train: true
}

function main() {
    const rail = new Rail(0, 0, window.innerWidth, window.innerHeight * 4);
    rail.setParent(document.body);

    rail.addSegment(Segment.Straight);
    rail.addSegment(Segment.FromTopToRight);
    rail.addSegment(Segment.StraightLeftToRight);
    rail.addSegment(Segment.StraightLeftToRight);
    rail.addSegment(Segment.FromLeftToBottom);
    rail.addSegment(Segment.Straight);
    rail.addSegment(Segment.FromTopToLeft);
    rail.addSegment(Segment.StraightRightToLeft);
    rail.addSegment(Segment.StraightRightToLeft);
    rail.addSegment(Segment.FromRightToTop);
    rail.addSegment(Segment.StraightToTop);

    const train = new Train(new Size(90, 170));
    train.setRail(rail);
    
    rail.clear();
    rail.render();
    train.render();

    window.addEventListener('wheel', e => {
        if(e.deltaY < 0)
            return;

        train.move(10);
    
        rail.clear();
        rail.render();
        train.render();
    });

    // const loop = () => {

    //     window.requestAnimationFrame(loop);
    // }

    // window.requestAnimationFrame(loop);
}

window.onload = main;