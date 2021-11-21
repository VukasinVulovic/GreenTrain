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
    FROM_RIGHT_TO_LEFT: 10
}

class Segment {
    constructor(type, pos) {
        this.rail = null;
        this.type = type;
        this.size = this.type.size;
        this.pos = pos;
        this.orientation = type.orientation;
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
        let prev = this.segments[this.segments.length - 1]; //previous segment
        let pos = new Pos((prev?.pos?.x || 0), (prev?.pos?.y || 0)); //position is same as previous segment's
        
        const segment = new Segment(type, pos); //create a new segment object
        segment.rail = this;

        //THIS DOES NOT DEFINE THE POSITION OF THE SEGMENT, IT DEFINESTHE POSITION OF THE NEXT ONE!!!!!!!!!!!!!
        if(prev) { //if there is a previous segment
            //add to position
            switch(prev.orientation) {
                case Orientation.TO_BOTTOM:
                    pos.add(new Size(0, prev.size.height));
                    break;
    
                case Orientation.FROM_TOP_TO_RIGHT:
                    pos.add(new Size(prev.size.width, 0));
                    break;
        
                case Orientation.FROM_LEFT_TO_RIGHT:
                    pos.add(new Size(prev.size.width, 0));
                    break;

                case Orientation.FROM_LEFT_TO_TOP:
                    pos.add(new Size(0, (prev.size.height + Math.abs(segment.size.height - prev.size.height))* -1)); //must account for top left positioning
                    break;

                case Orientation.TO_TOP:
                    pos.add(new Size(0, segment.size.height * -1)); //must account for top left positioning
                    break;

                case Orientation.FROM_BOTTOM_TO_RIGHT:
                    pos.add(new Size(prev.size.width, 0)); //must account for top left positioning
                    break;

                case Orientation.FROM_LEFT_TO_BOTTOM:
                    pos.add(new Size(0, prev.size.height));
                    break;

                case Orientation.FROM_TOP_TO_LEFT:
                    pos.add(new Size((prev.size.width + Math.abs(segment.size.width - prev.size.width)) * -1, 0));
                    break;

                case Orientation.FROM_RIGHT_TO_TOP:
                    pos.add(new Size(0, segment.size.height * -1));
                    break;

                case Orientation.FROM_RIGHT_TO_LEFT:
                    pos.add(new Size(segment.size.width * -1, 0)) //ok
                    break;

                default:
                    throw new Error('Unknown orientation for segment: ' + prev.orientation);
            }
        }

        //add segment to array and map
        this.segmentMap.set(new Range(pos, Pos.Add(pos, segment.size)), segment);
        this.segments.push(segment);
    }

    render() { //render all segments from array
        for(const segment of this.segments)
            segment.render();
    }
}

class Train {
    constructor(size, pos) {
        this.ditanceTraveled = 0;
        this.pos = pos;
        this.size = size;
        this.inverted = false;
        this.rail = null;
        this.onSegment = null;
        this.textures = {
            old: {
                vertical: new Texture('./assets/textures/trains/old.png', size),
                horizontal_to_right: new Texture('./assets/textures/trains/old_horizontal_to_right.png', new Size(size.height, size.width)),
                horizontal_from_left: new Texture('./assets/textures/trains/old_horizontal_from_left.png', new Size(size.height, size.width)),
                vertical_to_top: new Texture('./assets/textures/trains/old_to_top.png', size)
            }
        }
        
        this.texture = this.textures.old.vertical;
        this.orientation = Orientation.TO_BOTTOM;
        this.size_inverted = false;
    }
    
    setRail(rail) {
        this.rail = rail;

        if(this.rail?.segments[0])
            this.orientation = this.rail.segments[0].orientation;    
    }
    
    checkRotation() {
        const rotate = () => { //rotate size if not
            if(!this.size_inverted) { 
                this.size.invert();
                this.size_inverted = true;
            }
        }

        const unrotate = () => { //un-rotate size if is
            if(this.size_inverted) { 
                this.size.invert();
                this.size_inverted = false;
            }
        }

        switch(this.onSegment.orientation) { //set paramaters for rotation
            case Orientation.TO_BOTTOM:
            case Orientation.FROM_LEFT_TO_BOTTOM:
                unrotate();
                this.texture = this.textures.old.vertical;
                break;

            case Orientation.FROM_TOP_TO_RIGHT:
            case Orientation.FROM_BOTTOM_TO_RIGHT:
            case Orientation.FROM_LEFT_TO_RIGHT:
                rotate();
                this.texture = this.textures.old.horizontal_to_right;
                break;

            case Orientation.TO_TOP:
            case Orientation.FROM_LEFT_TO_TOP:
            case Orientation.FROM_RIGHT_TO_TOP:
                unrotate();
                this.texture = this.textures.old.vertical_to_top;
                break;

            case Orientation.FROM_TOP_TO_LEFT:
            case Orientation.FROM_RIGHT_TO_LEFT:
                rotate();
                this.texture = this.textures.old.horizontal_from_left;
                break;

            default:
                throw new Error('Unknown orientation for rotation ' + this.onSegment.orientation);
        }
    }

    move(v) {
        let segment = this.rail.segmentMap.get(Pos.Add(this.pos, new Size(0, 0))); //(this.inverted ? this.size.width : this.size.height) * 0.3)
        segment = segment.at(-1); //last segment from list

        if(segment) //if on segment, set this.onSegment
            this.onSegment = segment;

        switch(this.onSegment.orientation) { //set paramaters for orientation
            case Orientation.TO_BOTTOM:
                this.pos.add(new Pos(0, v));
                break;

            case Orientation.FROM_TOP_TO_RIGHT:
                this.pos.add(new Size(v, 0));
                break;

            case Orientation.FROM_LEFT_TO_RIGHT:
                this.pos.add(new Size(v, 0));
                break;

            case Orientation.FROM_LEFT_TO_TOP:
                this.pos.add(new Size(0, v * -1));
                break;

            case Orientation.TO_TOP:
                // this.pos.add(new Pos(0, v * -1));
                break;

            case Orientation.FROM_BOTTOM_TO_RIGHT:
                this.pos.add(new Pos(v, 0));
                break;

            case Orientation.FROM_LEFT_TO_BOTTOM:
                this.pos.add(new Pos(0, v));
                break;

            case Orientation.FROM_TOP_TO_LEFT:
                this.pos.add(new Pos(v * -1, 0));
                break;

            case Orientation.FROM_RIGHT_TO_TOP:
                this.pos.add(new Pos(0, v * -1));
                break;

            case Orientation.FROM_RIGHT_TO_LEFT:
                this.pos.add(new Pos(v * -1, 0));
                break;
            default:
                throw new Error('Unknown orientation for move ' + this.onSegment.orientation);
        }

        this.ditanceTraveled += Math.sign(v); //add to distance
    }

    render() {
        if(!this.rail)
            throw new Error('Rail object not set.');

        this.checkRotation();
        this.rail.drawTexture(this.texture, this.pos.x, this.pos.y, this.size.width, this.size.height); //render train texture
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
    size: new Size(230, 90)
}

Segment.StraightRightToLeft = {
    name: 'straight horizontal to left',
    texture: new Texture('./assets/textures/rail_segments/straight_horizontal.png'),
    orientation: Orientation.FROM_RIGHT_TO_LEFT,
    size: new Size(230, 90)
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

function main() {
    const rail = new Rail(0, 0, window.innerWidth, window.innerHeight * 4);
    rail.setParent(document.body);
    
    rail.addSegment(Segment.Straight);
    rail.addSegment(Segment.Straight);

    rail.addSegment(Segment.FromBottomToRight);
    rail.addSegment(Segment.StraightLeftToRight);
    rail.addSegment(Segment.FromLeftToBottom);
    rail.addSegment(Segment.Straight);
    rail.addSegment(Segment.FromTopToLeft);
    rail.addSegment(Segment.StraightRightToLeft);
    rail.addSegment(Segment.FromRightToTop);
    rail.addSegment(Segment.StraightToTop);
    
    const train = new Train(new Size(90, 170), new Pos(0, 0));
    train.setRail(rail);

    const loop = () => {
        train.move(10);
    
        rail.clear();
        rail.render();
        train.render();
        
        window.requestAnimationFrame(loop);
    }
    
    window.requestAnimationFrame(loop);
}

window.onload = main;