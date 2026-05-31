const round = (value: number, decimals: number): number => 
    Math.round(value * (10 ** decimals)) / (10 ** decimals);

export type PathCommand = string;
export type Point = [number, number];
export type PathComponent = [PathCommand, ...number[]];

export interface ParsedCommand {
    index: number;
    commandLetter: string;
    originalValues: number[];
    absoluteValues: number[];
    endPoint: Point;
    startPoint: Point;
    startHandlePoint?: Point;
    endHandlePoint?: Point;
    relativeCommand?: number[];
    absoluteCommand?: number[];
    isRelative: () => boolean;
    setAbsolute: () => void;
    setRelative: () => void;
    parse: (updatedCommand: (string | number)[]) => void;
    quadPolyLine?: () => number[];
}

type CommandGrammar = Record<string, RegExp[]>;
type PointGrammarFunction = (command: PathComponent, previousPoint?: Point, origin?: Point) => Point;
type PointGrammar = Record<string, PointGrammarFunction>;

export class PathParser {
    static validCommand = /^[\t\n\f\r\s]*([achlmqstvz])[\t\n\f\r\s]*/i;
    static validFlag = /^[01]/;
    static validCoordinate = /^[+-]?((\d*\.\d+)|(\d+\.)|(\d+))(e[+-]?\d+)?/i;
    static validComma = /^(([\t\n\f\r\s]+,?[\t\n\f\r\s]*)|(,[\t\n\f\r\s]*))/;

    static pathGrammar: CommandGrammar = {
        m: [this.validCoordinate, this.validCoordinate],
        l: [this.validCoordinate, this.validCoordinate],
        h: [this.validCoordinate],
        v: [this.validCoordinate],
        z: [],
        c: [this.validCoordinate, this.validCoordinate, this.validCoordinate, this.validCoordinate, this.validCoordinate, this.validCoordinate],
        s: [this.validCoordinate, this.validCoordinate, this.validCoordinate, this.validCoordinate],
        q: [this.validCoordinate, this.validCoordinate, this.validCoordinate, this.validCoordinate],
        t: [this.validCoordinate, this.validCoordinate],
        a: [this.validCoordinate, this.validCoordinate, this.validCoordinate, this.validFlag, this.validFlag, this.validCoordinate, this.validCoordinate],
    };

    static pointGrammar: PointGrammar = {
        z: (origin: PathComponent): Point => (origin as unknown as Point).slice(1) as Point,
        Z: (origin: PathComponent): Point => (origin as unknown as Point).slice(1) as Point,
        m: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0] + command[1], previousPoint[1] + command[2]],
        M: (command: PathComponent): Point => [command[1], command[2]],
        h: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0] + command[1], previousPoint[1]],
        H: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [command[1], previousPoint[1]],
        v: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0], previousPoint[1] + command[1]],
        V: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0], command[1]],
        l: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0] + command[1], previousPoint[1] + command[2]],
        L: (command: PathComponent): Point => [command[1], command[2]],
        a: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0] + command[6], previousPoint[1] + command[7]],
        A: (command: PathComponent): Point => [command[6], command[7]],
        c: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0] + command[5], previousPoint[1] + command[6]],
        C: (command: PathComponent): Point => [command[5], command[6]],
        t: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0] + command[1], previousPoint[1] + command[2]],
        T: (command: PathComponent): Point => [command[1], command[2]],
        q: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0] + command[3], previousPoint[1] + command[4]],
        Q: (command: PathComponent): Point => [command[3], command[4]],
        s: (command: PathComponent, previousPoint: Point = [0, 0]): Point => 
            [previousPoint[0] + command[3], previousPoint[1] + command[4]],
        S: (command: PathComponent): Point => [command[3], command[4]]
    };

    static parseComponents(type: string, command: string, cursor: number): [number, PathComponent[]] {
        const expectedCommands = this.pathGrammar[type.toLowerCase()];
        const components: PathComponent[] = [];
        
        while (cursor <= command.length) {
            const component: PathComponent = [type];
            
            for (const regex of expectedCommands) {
                const match = command.slice(cursor).match(regex);
                if (match !== null) {
                    component.push(round(parseFloat(match[0]), 2));
                    cursor += match[0].length;
                    const nextSlice = command.slice(cursor).match(this.validComma);
                    if (nextSlice !== null) cursor += nextSlice[0].length;
                } else if (component.length === 1) {
                    return [cursor, components];
                } else {
                    throw new Error(`Invalid path: first error at char ${cursor}`);
                }
            }
            
            components.push(component);
            if (expectedCommands.length === 0) return [cursor, components];
            if (type === 'm') type = 'l';
            if (type === 'M') type = 'L';
        }
        throw new Error(`Invalid path: first error at char ${cursor}`);
    }

    static parseRaw(path: string): PathComponent[] {
        let cursor = 0;
        const parsedComponents: PathComponent[] = [];
        
        while (cursor < path.length) {
            const match = path.slice(cursor).match(this.validCommand);
            if (match !== null) {
                const command = match[1];
                cursor += match[0].length;
                const [newCursor, components] = this.parseComponents(command, path, cursor);
                cursor = newCursor;
                parsedComponents.push(...components);
            } else {
                throw new Error(`Invalid path: first error at char ${cursor}`);
            }
        }
        return parsedComponents;
    }

    static parseAbsolute(rawComponents: PathComponent[], origin: Point = [0, 0]): ParsedCommand[] {
        let previousPoint = origin;
        const parsedCommands: ParsedCommand[] = [];
        
        rawComponents.forEach((component, index) => {
            const commandLetter = component[0];
            const originalValues = component.slice(1) as number[];
            
            // Convert to absolute coordinates
            const absoluteValues = [...originalValues];
            const endPoint = this.pointGrammar[commandLetter](component, previousPoint, origin);
            
            const parsedCommand: ParsedCommand = {
                index,
                commandLetter,
                originalValues,
                absoluteValues,
                endPoint,
                startPoint: [...previousPoint],
                relativeCommand: [...originalValues],
                absoluteCommand: [...absoluteValues],
                isRelative: function() { return this.commandLetter.toLowerCase() === this.commandLetter; },
                setAbsolute: function() { 
                    const commandType = this.commandLetter.toLowerCase();
                    const currentPoint = this.startPoint;
                    
                    // Only convert if currently relative
                    if (this.commandLetter.toLowerCase() === this.commandLetter && commandType !== 'z') {
                        switch (commandType) {
                            case 'm':
                            case 'l':
                                // Move/Line: convert relative to absolute
                                this.originalValues = [
                                    currentPoint[0] + this.originalValues[0],
                                    currentPoint[1] + this.originalValues[1]
                                ];
                                break;
                            case 'h':
                                // Horizontal: convert relative to absolute
                                this.originalValues = [currentPoint[0] + this.originalValues[0]];
                                break;
                            case 'v':
                                // Vertical: convert relative to absolute  
                                this.originalValues = [currentPoint[1] + this.originalValues[0]];
                                break;
                            case 'c':
                                // Cubic bezier: convert all points to absolute
                                this.originalValues = [
                                    currentPoint[0] + this.originalValues[0], currentPoint[1] + this.originalValues[1],
                                    currentPoint[0] + this.originalValues[2], currentPoint[1] + this.originalValues[3],
                                    currentPoint[0] + this.originalValues[4], currentPoint[1] + this.originalValues[5]
                                ];
                                break;
                            case 's':
                                // Smooth cubic: convert points to absolute
                                this.originalValues = [
                                    currentPoint[0] + this.originalValues[0], currentPoint[1] + this.originalValues[1],
                                    currentPoint[0] + this.originalValues[2], currentPoint[1] + this.originalValues[3]
                                ];
                                break;
                            case 'q':
                                // Quadratic: convert points to absolute
                                this.originalValues = [
                                    currentPoint[0] + this.originalValues[0], currentPoint[1] + this.originalValues[1],
                                    currentPoint[0] + this.originalValues[2], currentPoint[1] + this.originalValues[3]
                                ];
                                break;
                            case 't':
                                // Smooth quadratic: convert point to absolute
                                this.originalValues = [
                                    currentPoint[0] + this.originalValues[0], currentPoint[1] + this.originalValues[1]
                                ];
                                break;
                            case 'a':
                                // Arc: convert endpoint to absolute (keep radii/flags unchanged)
                                this.originalValues = [
                                    this.originalValues[0], this.originalValues[1], this.originalValues[2],
                                    this.originalValues[3], this.originalValues[4],
                                    currentPoint[0] + this.originalValues[5], currentPoint[1] + this.originalValues[6]
                                ];
                                break;
                        }
                        this.commandLetter = this.commandLetter.toUpperCase();
                    }
                },
                setRelative: function() { 
                    const commandType = this.commandLetter.toLowerCase();
                    const currentPoint = this.startPoint;
                    
                    // Only convert if currently absolute
                    if (this.commandLetter.toUpperCase() === this.commandLetter && commandType !== 'z') {
                        switch (commandType) {
                            case 'm':
                            case 'l':
                                // Move/Line: convert absolute to relative
                                this.originalValues = [
                                    this.originalValues[0] - currentPoint[0],
                                    this.originalValues[1] - currentPoint[1]
                                ];
                                break;
                            case 'h':
                                // Horizontal: convert absolute to relative
                                this.originalValues = [this.originalValues[0] - currentPoint[0]];
                                break;
                            case 'v':
                                // Vertical: convert absolute to relative
                                this.originalValues = [this.originalValues[0] - currentPoint[1]];
                                break;
                            case 'c':
                                // Cubic bezier: convert all points to relative
                                this.originalValues = [
                                    this.originalValues[0] - currentPoint[0], this.originalValues[1] - currentPoint[1],
                                    this.originalValues[2] - currentPoint[0], this.originalValues[3] - currentPoint[1],
                                    this.originalValues[4] - currentPoint[0], this.originalValues[5] - currentPoint[1]
                                ];
                                break;
                            case 's':
                                // Smooth cubic: convert points to relative
                                this.originalValues = [
                                    this.originalValues[0] - currentPoint[0], this.originalValues[1] - currentPoint[1],
                                    this.originalValues[2] - currentPoint[0], this.originalValues[3] - currentPoint[1]
                                ];
                                break;
                            case 'q':
                                // Quadratic: convert points to relative
                                this.originalValues = [
                                    this.originalValues[0] - currentPoint[0], this.originalValues[1] - currentPoint[1],
                                    this.originalValues[2] - currentPoint[0], this.originalValues[3] - currentPoint[1]
                                ];
                                break;
                            case 't':
                                // Smooth quadratic: convert point to relative
                                this.originalValues = [
                                    this.originalValues[0] - currentPoint[0], this.originalValues[1] - currentPoint[1]
                                ];
                                break;
                            case 'a':
                                // Arc: convert endpoint to relative (keep radii/flags unchanged)
                                this.originalValues = [
                                    this.originalValues[0], this.originalValues[1], this.originalValues[2],
                                    this.originalValues[3], this.originalValues[4],
                                    this.originalValues[5] - currentPoint[0], this.originalValues[6] - currentPoint[1]
                                ];
                                break;
                        }
                        this.commandLetter = this.commandLetter.toLowerCase();
                    }
                },
                parse: function(updatedCommand: (string | number)[]) {
                    this.commandLetter = updatedCommand[0] as string;
                    this.originalValues = updatedCommand.slice(1) as number[];
                }
            };
            
            // Add handle points for cubic bezier curves
            if (commandLetter.toLowerCase() === 'c') {
                if (commandLetter === 'c') {
                    parsedCommand.startHandlePoint = [
                        previousPoint[0] + originalValues[0],
                        previousPoint[1] + originalValues[1]
                    ];
                    parsedCommand.endHandlePoint = [
                        previousPoint[0] + originalValues[2],
                        previousPoint[1] + originalValues[3]
                    ];
                } else {
                    parsedCommand.startHandlePoint = [originalValues[0], originalValues[1]];
                    parsedCommand.endHandlePoint = [originalValues[2], originalValues[3]];
                }
            }
            
            parsedCommands.push(parsedCommand);
            previousPoint = endPoint;
        });
        
        return parsedCommands;
    }

    static toString(parsedCommands: ParsedCommand[]): string {
        return parsedCommands.map(command => 
            `${command.commandLetter} ${command.originalValues.join(' ')}`
        ).join(' ');
    }
}

export class Path {
    public parsedCommands: ParsedCommand[];

    constructor(pathString: string) {
        const rawComponents = PathParser.parseRaw(pathString);
        this.parsedCommands = PathParser.parseAbsolute(rawComponents);
    }

    toString(): string {
        return PathParser.toString(this.parsedCommands);
    }

    absolute(): string {
        let currentPoint: Point = [0, 0];
        const absoluteCommands = this.parsedCommands.map(cmd => {
            const newCmd = { ...cmd };
            const commandType = newCmd.commandLetter.toLowerCase();
            
            // Convert relative commands to absolute by adding current position
            if (newCmd.commandLetter.toLowerCase() === newCmd.commandLetter) {
                // This is a relative command, convert to absolute
                switch (commandType) {
                    case 'm':
                    case 'l':
                        // Move/Line: [x, y] → [currentX + x, currentY + y]
                        newCmd.originalValues = [
                            currentPoint[0] + newCmd.originalValues[0],
                            currentPoint[1] + newCmd.originalValues[1]
                        ];
                        break;
                    case 'h':
                        // Horizontal: [x] → [currentX + x]
                        newCmd.originalValues = [currentPoint[0] + newCmd.originalValues[0]];
                        break;
                    case 'v':
                        // Vertical: [y] → [currentY + y]
                        newCmd.originalValues = [currentPoint[1] + newCmd.originalValues[0]];
                        break;
                    case 'c':
                        // Cubic bezier: [x1, y1, x2, y2, x, y] → all relative to current
                        newCmd.originalValues = [
                            currentPoint[0] + newCmd.originalValues[0], // x1
                            currentPoint[1] + newCmd.originalValues[1], // y1
                            currentPoint[0] + newCmd.originalValues[2], // x2
                            currentPoint[1] + newCmd.originalValues[3], // y2
                            currentPoint[0] + newCmd.originalValues[4], // x
                            currentPoint[1] + newCmd.originalValues[5]  // y
                        ];
                        break;
                    case 's':
                        // Smooth cubic: [x2, y2, x, y] → relative to current
                        newCmd.originalValues = [
                            currentPoint[0] + newCmd.originalValues[0], // x2
                            currentPoint[1] + newCmd.originalValues[1], // y2
                            currentPoint[0] + newCmd.originalValues[2], // x
                            currentPoint[1] + newCmd.originalValues[3]  // y
                        ];
                        break;
                    case 'q':
                        // Quadratic: [x1, y1, x, y] → relative to current
                        newCmd.originalValues = [
                            currentPoint[0] + newCmd.originalValues[0], // x1
                            currentPoint[1] + newCmd.originalValues[1], // y1
                            currentPoint[0] + newCmd.originalValues[2], // x
                            currentPoint[1] + newCmd.originalValues[3]  // y
                        ];
                        break;
                    case 't':
                        // Smooth quadratic: [x, y] → relative to current
                        newCmd.originalValues = [
                            currentPoint[0] + newCmd.originalValues[0], // x
                            currentPoint[1] + newCmd.originalValues[1]  // y
                        ];
                        break;
                    case 'a':
                        // Arc: [rx, ry, rotation, large-arc, sweep, x, y] → only x,y are relative
                        newCmd.originalValues = [
                            newCmd.originalValues[0], // rx (unchanged)
                            newCmd.originalValues[1], // ry (unchanged)
                            newCmd.originalValues[2], // rotation (unchanged)
                            newCmd.originalValues[3], // large-arc-flag (unchanged)
                            newCmd.originalValues[4], // sweep-flag (unchanged)
                            currentPoint[0] + newCmd.originalValues[5], // x
                            currentPoint[1] + newCmd.originalValues[6]  // y
                        ];
                        break;
                }
                
                // Convert to uppercase (absolute command)
                newCmd.commandLetter = newCmd.commandLetter.toUpperCase();
            }
            
            // Update current position to the end point of this command
            currentPoint = [...newCmd.endPoint];
            
            return newCmd;
        });
        
        return PathParser.toString(absoluteCommands);
    }

    relative(): string {
        let currentPoint: Point = [0, 0];
        const relativeCommands = this.parsedCommands.map(cmd => {
            const newCmd = { ...cmd };
            const commandType = newCmd.commandLetter.toLowerCase();
            
            // Convert absolute commands to relative by subtracting current position
            if (newCmd.commandLetter.toUpperCase() === newCmd.commandLetter && commandType !== 'z') {
                // This is an absolute command, convert to relative
                switch (commandType) {
                    case 'm':
                    case 'l':
                        // Move/Line: [x, y] → [x - currentX, y - currentY]
                        newCmd.originalValues = [
                            newCmd.originalValues[0] - currentPoint[0],
                            newCmd.originalValues[1] - currentPoint[1]
                        ];
                        break;
                    case 'h':
                        // Horizontal: [x] → [x - currentX]
                        newCmd.originalValues = [newCmd.originalValues[0] - currentPoint[0]];
                        break;
                    case 'v':
                        // Vertical: [y] → [y - currentY]
                        newCmd.originalValues = [newCmd.originalValues[0] - currentPoint[1]];
                        break;
                    case 'c':
                        // Cubic bezier: make all coordinates relative to current
                        newCmd.originalValues = [
                            newCmd.originalValues[0] - currentPoint[0], // x1
                            newCmd.originalValues[1] - currentPoint[1], // y1
                            newCmd.originalValues[2] - currentPoint[0], // x2
                            newCmd.originalValues[3] - currentPoint[1], // y2
                            newCmd.originalValues[4] - currentPoint[0], // x
                            newCmd.originalValues[5] - currentPoint[1]  // y
                        ];
                        break;
                    case 's':
                        // Smooth cubic: make coordinates relative to current
                        newCmd.originalValues = [
                            newCmd.originalValues[0] - currentPoint[0], // x2
                            newCmd.originalValues[1] - currentPoint[1], // y2
                            newCmd.originalValues[2] - currentPoint[0], // x
                            newCmd.originalValues[3] - currentPoint[1]  // y
                        ];
                        break;
                    case 'q':
                        // Quadratic: make coordinates relative to current
                        newCmd.originalValues = [
                            newCmd.originalValues[0] - currentPoint[0], // x1
                            newCmd.originalValues[1] - currentPoint[1], // y1
                            newCmd.originalValues[2] - currentPoint[0], // x
                            newCmd.originalValues[3] - currentPoint[1]  // y
                        ];
                        break;
                    case 't':
                        // Smooth quadratic: make coordinates relative to current
                        newCmd.originalValues = [
                            newCmd.originalValues[0] - currentPoint[0], // x
                            newCmd.originalValues[1] - currentPoint[1]  // y
                        ];
                        break;
                    case 'a':
                        // Arc: only x,y coordinates are relative
                        newCmd.originalValues = [
                            newCmd.originalValues[0], // rx (unchanged)
                            newCmd.originalValues[1], // ry (unchanged)
                            newCmd.originalValues[2], // rotation (unchanged)
                            newCmd.originalValues[3], // large-arc-flag (unchanged)
                            newCmd.originalValues[4], // sweep-flag (unchanged)
                            newCmd.originalValues[5] - currentPoint[0], // x
                            newCmd.originalValues[6] - currentPoint[1]  // y
                        ];
                        break;
                }
                
                // Convert to lowercase (relative command)
                newCmd.commandLetter = newCmd.commandLetter.toLowerCase();
            }
            
            // Update current position to the end point of this command
            currentPoint = [...newCmd.endPoint];
            
            return newCmd;
        });
        
        return PathParser.toString(relativeCommands);
    }

    normalized(): string {
        // Convert all commands to absolute for normalization
        return this.absolute();
    }

    translate(deltaX: number, deltaY: number): void {
        // Move all commands by the delta amounts
        this.parsedCommands.forEach(cmd => {
            const commandType = cmd.commandLetter.toLowerCase();
            
            switch (commandType) {
                case 'm':
                case 'l':
                    // Move/Line: adjust endpoint
                    if (cmd.commandLetter.toUpperCase() === cmd.commandLetter) {
                        // Absolute: add delta to coordinates
                        cmd.originalValues[0] += deltaX;
                        cmd.originalValues[1] += deltaY;
                    }
                    // Relative commands don't change with translation
                    break;
                case 'h':
                    // Horizontal: only affects absolute commands
                    if (cmd.commandLetter.toUpperCase() === cmd.commandLetter) {
                        cmd.originalValues[0] += deltaX;
                    }
                    break;
                case 'v':
                    // Vertical: only affects absolute commands
                    if (cmd.commandLetter.toUpperCase() === cmd.commandLetter) {
                        cmd.originalValues[0] += deltaY;
                    }
                    break;
                case 'c':
                    // Cubic bezier: adjust all control points and endpoint
                    if (cmd.commandLetter.toUpperCase() === cmd.commandLetter) {
                        cmd.originalValues[0] += deltaX; // x1
                        cmd.originalValues[1] += deltaY; // y1
                        cmd.originalValues[2] += deltaX; // x2
                        cmd.originalValues[3] += deltaY; // y2
                        cmd.originalValues[4] += deltaX; // x
                        cmd.originalValues[5] += deltaY; // y
                    }
                    break;
                case 's':
                    // Smooth cubic: adjust control point and endpoint
                    if (cmd.commandLetter.toUpperCase() === cmd.commandLetter) {
                        cmd.originalValues[0] += deltaX; // x2
                        cmd.originalValues[1] += deltaY; // y2
                        cmd.originalValues[2] += deltaX; // x
                        cmd.originalValues[3] += deltaY; // y
                    }
                    break;
                case 'q':
                    // Quadratic: adjust control point and endpoint
                    if (cmd.commandLetter.toUpperCase() === cmd.commandLetter) {
                        cmd.originalValues[0] += deltaX; // x1
                        cmd.originalValues[1] += deltaY; // y1
                        cmd.originalValues[2] += deltaX; // x
                        cmd.originalValues[3] += deltaY; // y
                    }
                    break;
                case 't':
                    // Smooth quadratic: adjust endpoint
                    if (cmd.commandLetter.toUpperCase() === cmd.commandLetter) {
                        cmd.originalValues[0] += deltaX; // x
                        cmd.originalValues[1] += deltaY; // y
                    }
                    break;
                case 'a':
                    // Arc: only adjust endpoint
                    if (cmd.commandLetter.toUpperCase() === cmd.commandLetter) {
                        cmd.originalValues[5] += deltaX; // x
                        cmd.originalValues[6] += deltaY; // y
                    }
                    break;
            }
            
            // Update end point
            if (commandType !== 'z') {
                cmd.endPoint = [cmd.endPoint[0] + deltaX, cmd.endPoint[1] + deltaY];
            }
        });
    }

    scale(scaleX: number, scaleY: number): void {
        // Scale all coordinates by the scale factors
        this.parsedCommands.forEach(cmd => {
            const commandType = cmd.commandLetter.toLowerCase();
            
            switch (commandType) {
                case 'm':
                case 'l':
                    // Move/Line: scale coordinates
                    cmd.originalValues[0] *= scaleX;
                    cmd.originalValues[1] *= scaleY;
                    break;
                case 'h':
                    // Horizontal: scale X coordinate
                    cmd.originalValues[0] *= scaleX;
                    break;
                case 'v':
                    // Vertical: scale Y coordinate
                    cmd.originalValues[0] *= scaleY;
                    break;
                case 'c':
                    // Cubic bezier: scale all coordinates
                    cmd.originalValues[0] *= scaleX; // x1
                    cmd.originalValues[1] *= scaleY; // y1
                    cmd.originalValues[2] *= scaleX; // x2
                    cmd.originalValues[3] *= scaleY; // y2
                    cmd.originalValues[4] *= scaleX; // x
                    cmd.originalValues[5] *= scaleY; // y
                    break;
                case 's':
                    // Smooth cubic: scale all coordinates
                    cmd.originalValues[0] *= scaleX; // x2
                    cmd.originalValues[1] *= scaleY; // y2
                    cmd.originalValues[2] *= scaleX; // x
                    cmd.originalValues[3] *= scaleY; // y
                    break;
                case 'q':
                    // Quadratic: scale all coordinates
                    cmd.originalValues[0] *= scaleX; // x1
                    cmd.originalValues[1] *= scaleY; // y1
                    cmd.originalValues[2] *= scaleX; // x
                    cmd.originalValues[3] *= scaleY; // y
                    break;
                case 't':
                    // Smooth quadratic: scale coordinates
                    cmd.originalValues[0] *= scaleX; // x
                    cmd.originalValues[1] *= scaleY; // y
                    break;
                case 'a':
                    // Arc: scale radii and endpoint (keep flags unchanged)
                    cmd.originalValues[0] *= scaleX; // rx
                    cmd.originalValues[1] *= scaleY; // ry
                    // rotation, large-arc-flag, sweep-flag unchanged
                    cmd.originalValues[5] *= scaleX; // x
                    cmd.originalValues[6] *= scaleY; // y
                    break;
            }
            
            // Update end point
            if (commandType !== 'z') {
                cmd.endPoint = [cmd.endPoint[0] * scaleX, cmd.endPoint[1] * scaleY];
            }
        });
    }

    snapToGrid(gridInterval: number): void {
        // Snap all coordinates to the nearest grid point
        const snapToGrid = (value: number): number => 
            Math.round(value / gridInterval) * gridInterval;
        
        this.parsedCommands.forEach(cmd => {
            const commandType = cmd.commandLetter.toLowerCase();
            
            switch (commandType) {
                case 'm':
                case 'l':
                    // Move/Line: snap coordinates
                    cmd.originalValues[0] = snapToGrid(cmd.originalValues[0]);
                    cmd.originalValues[1] = snapToGrid(cmd.originalValues[1]);
                    break;
                case 'h':
                    // Horizontal: snap X coordinate
                    cmd.originalValues[0] = snapToGrid(cmd.originalValues[0]);
                    break;
                case 'v':
                    // Vertical: snap Y coordinate
                    cmd.originalValues[0] = snapToGrid(cmd.originalValues[0]);
                    break;
                case 'c':
                    // Cubic bezier: snap all coordinates
                    cmd.originalValues[0] = snapToGrid(cmd.originalValues[0]); // x1
                    cmd.originalValues[1] = snapToGrid(cmd.originalValues[1]); // y1
                    cmd.originalValues[2] = snapToGrid(cmd.originalValues[2]); // x2
                    cmd.originalValues[3] = snapToGrid(cmd.originalValues[3]); // y2
                    cmd.originalValues[4] = snapToGrid(cmd.originalValues[4]); // x
                    cmd.originalValues[5] = snapToGrid(cmd.originalValues[5]); // y
                    break;
                case 's':
                    // Smooth cubic: snap all coordinates
                    cmd.originalValues[0] = snapToGrid(cmd.originalValues[0]); // x2
                    cmd.originalValues[1] = snapToGrid(cmd.originalValues[1]); // y2
                    cmd.originalValues[2] = snapToGrid(cmd.originalValues[2]); // x
                    cmd.originalValues[3] = snapToGrid(cmd.originalValues[3]); // y
                    break;
                case 'q':
                    // Quadratic: snap all coordinates
                    cmd.originalValues[0] = snapToGrid(cmd.originalValues[0]); // x1
                    cmd.originalValues[1] = snapToGrid(cmd.originalValues[1]); // y1
                    cmd.originalValues[2] = snapToGrid(cmd.originalValues[2]); // x
                    cmd.originalValues[3] = snapToGrid(cmd.originalValues[3]); // y
                    break;
                case 't':
                    // Smooth quadratic: snap coordinates
                    cmd.originalValues[0] = snapToGrid(cmd.originalValues[0]); // x
                    cmd.originalValues[1] = snapToGrid(cmd.originalValues[1]); // y
                    break;
                case 'a':
                    // Arc: snap radii and endpoint (keep flags unchanged)
                    cmd.originalValues[0] = snapToGrid(cmd.originalValues[0]); // rx
                    cmd.originalValues[1] = snapToGrid(cmd.originalValues[1]); // ry
                    // rotation, large-arc-flag, sweep-flag unchanged
                    cmd.originalValues[5] = snapToGrid(cmd.originalValues[5]); // x
                    cmd.originalValues[6] = snapToGrid(cmd.originalValues[6]); // y
                    break;
            }
            
            // Update end point
            if (commandType !== 'z') {
                cmd.endPoint = [snapToGrid(cmd.endPoint[0]), snapToGrid(cmd.endPoint[1])];
            }
        });
    }

    rotate(angleDegrees: number, centerX?: number, centerY?: number): void {
        // Simple approach: convert to absolute, rotate all points, reconstruct
        const originalPath = this.toString();
        
        // Convert to absolute coordinates first
        const absolutePath = this.absolute();
        
        // Parse the absolute path to get clean absolute commands
        const tempPath = new Path(absolutePath);
        
        // Calculate center if not provided
        let rotationCenterX = centerX;
        let rotationCenterY = centerY;
        
        if (rotationCenterX === undefined || rotationCenterY === undefined) {
            const bounds = tempPath.getBounds();
            rotationCenterX = bounds.centerX;
            rotationCenterY = bounds.centerY;
        }
        
        // Convert angle to radians and create rotation matrix
        const angleRad = (angleDegrees * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        const rotatePoint = (x: number, y: number): [number, number] => {
            const translatedX = x - rotationCenterX!;
            const translatedY = y - rotationCenterY!;
            
            const rotatedX = translatedX * cos - translatedY * sin;
            const rotatedY = translatedX * sin + translatedY * cos;
            
            return [rotatedX + rotationCenterX!, rotatedY + rotationCenterY!];
        };
        
        // Rotate all points in the absolute path
        tempPath.parsedCommands.forEach(cmd => {
            const commandType = cmd.commandLetter.toLowerCase();
            
            switch (commandType) {
                case 'm':
                case 'l':
                    const [newX, newY] = rotatePoint(cmd.originalValues[0], cmd.originalValues[1]);
                    cmd.originalValues[0] = newX;
                    cmd.originalValues[1] = newY;
                    cmd.endPoint = [newX, newY];
                    break;
                case 'h':
                    // Convert H to L since rotation breaks horizontal constraint
                    const [rotatedHX, rotatedHY] = rotatePoint(cmd.originalValues[0], cmd.endPoint[1]);
                    cmd.commandLetter = 'L';
                    cmd.originalValues = [rotatedHX, rotatedHY];
                    cmd.endPoint = [rotatedHX, rotatedHY];
                    break;
                case 'v':
                    // Convert V to L since rotation breaks vertical constraint
                    const [rotatedVX, rotatedVY] = rotatePoint(cmd.endPoint[0], cmd.originalValues[0]);
                    cmd.commandLetter = 'L';
                    cmd.originalValues = [rotatedVX, rotatedVY];
                    cmd.endPoint = [rotatedVX, rotatedVY];
                    break;
                case 'c':
                    // Rotate all control points and endpoint
                    const [x1, y1] = rotatePoint(cmd.originalValues[0], cmd.originalValues[1]);
                    const [x2, y2] = rotatePoint(cmd.originalValues[2], cmd.originalValues[3]);
                    const [x, y] = rotatePoint(cmd.originalValues[4], cmd.originalValues[5]);
                    cmd.originalValues = [x1, y1, x2, y2, x, y];
                    cmd.endPoint = [x, y];
                    break;
                case 's':
                    const [sx2, sy2] = rotatePoint(cmd.originalValues[0], cmd.originalValues[1]);
                    const [sx, sy] = rotatePoint(cmd.originalValues[2], cmd.originalValues[3]);
                    cmd.originalValues = [sx2, sy2, sx, sy];
                    cmd.endPoint = [sx, sy];
                    break;
                case 'q':
                    const [qx1, qy1] = rotatePoint(cmd.originalValues[0], cmd.originalValues[1]);
                    const [qx, qy] = rotatePoint(cmd.originalValues[2], cmd.originalValues[3]);
                    cmd.originalValues = [qx1, qy1, qx, qy];
                    cmd.endPoint = [qx, qy];
                    break;
                case 't':
                    const [tx, ty] = rotatePoint(cmd.originalValues[0], cmd.originalValues[1]);
                    cmd.originalValues = [tx, ty];
                    cmd.endPoint = [tx, ty];
                    break;
                case 'a':
                    // Rotate endpoint and add rotation to arc's internal angle
                    const [ax, ay] = rotatePoint(cmd.originalValues[5], cmd.originalValues[6]);
                    cmd.originalValues[2] = (cmd.originalValues[2] + angleDegrees) % 360;
                    cmd.originalValues[5] = ax;
                    cmd.originalValues[6] = ay;
                    cmd.endPoint = [ax, ay];
                    break;
            }
        });
        
        // Replace our commands with the rotated absolute commands
        this.parsedCommands = tempPath.parsedCommands;
    }

    getBounds(): { minX: number; minY: number; maxX: number; maxY: number; centerX: number; centerY: number } {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        this.parsedCommands.forEach(cmd => {
            const commandType = cmd.commandLetter.toLowerCase();
            
            // Check all coordinate points in each command
            switch (commandType) {
                case 'm':
                case 'l':
                    minX = Math.min(minX, cmd.originalValues[0]);
                    minY = Math.min(minY, cmd.originalValues[1]);
                    maxX = Math.max(maxX, cmd.originalValues[0]);
                    maxY = Math.max(maxY, cmd.originalValues[1]);
                    break;
                case 'h':
                    minX = Math.min(minX, cmd.originalValues[0]);
                    maxX = Math.max(maxX, cmd.originalValues[0]);
                    break;
                case 'v':
                    minY = Math.min(minY, cmd.originalValues[0]);
                    maxY = Math.max(maxY, cmd.originalValues[0]);
                    break;
                case 'c':
                    // Check all control points and endpoint
                    for (let i = 0; i < 6; i += 2) {
                        minX = Math.min(minX, cmd.originalValues[i]);
                        minY = Math.min(minY, cmd.originalValues[i + 1]);
                        maxX = Math.max(maxX, cmd.originalValues[i]);
                        maxY = Math.max(maxY, cmd.originalValues[i + 1]);
                    }
                    break;
                case 's':
                case 'q':
                    // Check control point and endpoint
                    for (let i = 0; i < 4; i += 2) {
                        minX = Math.min(minX, cmd.originalValues[i]);
                        minY = Math.min(minY, cmd.originalValues[i + 1]);
                        maxX = Math.max(maxX, cmd.originalValues[i]);
                        maxY = Math.max(maxY, cmd.originalValues[i + 1]);
                    }
                    break;
                case 't':
                    minX = Math.min(minX, cmd.originalValues[0]);
                    minY = Math.min(minY, cmd.originalValues[1]);
                    maxX = Math.max(maxX, cmd.originalValues[0]);
                    maxY = Math.max(maxY, cmd.originalValues[1]);
                    break;
                case 'a':
                    // For arcs, just use the endpoint (simplified)
                    minX = Math.min(minX, cmd.originalValues[5]);
                    minY = Math.min(minY, cmd.originalValues[6]);
                    maxX = Math.max(maxX, cmd.originalValues[5]);
                    maxY = Math.max(maxY, cmd.originalValues[6]);
                    break;
            }
        });
        
        return {
            minX,
            minY,
            maxX,
            maxY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    adjustDescriptorPoint(commandIndex: string | number, newX: number, newY: number): void {
        const index = typeof commandIndex === 'string' ? parseInt(commandIndex) : commandIndex;
        const command = this.parsedCommands[index];
        
        if (command) {
            const deltaX = newX - command.endPoint[0];
            const deltaY = newY - command.endPoint[1];
            const commandType = command.commandLetter.toLowerCase();
            
            // Handle single-parameter commands (H, V) specially
            if (commandType === 'h') {
                // Horizontal line - only X parameter
                if (command.commandLetter.toLowerCase() === command.commandLetter) {
                    // Relative: adjust by delta
                    command.originalValues[0] += deltaX;
                } else {
                    // Absolute: set to new X
                    command.originalValues[0] = newX;
                }
                command.endPoint = [newX, command.endPoint[1]]; // Keep Y unchanged
            } else if (commandType === 'v') {
                // Vertical line - only Y parameter
                if (command.commandLetter.toLowerCase() === command.commandLetter) {
                    // Relative: adjust by delta
                    command.originalValues[0] += deltaY;
                } else {
                    // Absolute: set to new Y
                    command.originalValues[0] = newY;
                }
                command.endPoint = [command.endPoint[0], newY]; // Keep X unchanged
            } else {
                // Multi-parameter commands (M, L, C, S, Q, T, A) - standard handling
                if (command.commandLetter.toLowerCase() === command.commandLetter) {
                    // Relative command
                    command.originalValues[command.originalValues.length - 2] += deltaX;
                    command.originalValues[command.originalValues.length - 1] += deltaY;
                } else {
                    // Absolute command
                    command.originalValues[command.originalValues.length - 2] = newX;
                    command.originalValues[command.originalValues.length - 1] = newY;
                }
                command.endPoint = [newX, newY];
            }
        }
    }

    adjustStartHandlePoint(commandIndex: string | number, newX: number, newY: number): void {
        const index = typeof commandIndex === 'string' ? parseInt(commandIndex) : commandIndex;
        const command = this.parsedCommands[index];
        
        if (command && command.startHandlePoint) {
            if (command.commandLetter.toLowerCase() === command.commandLetter) {
                // Relative command
                const deltaX = newX - command.startHandlePoint[0];
                const deltaY = newY - command.startHandlePoint[1];
                command.originalValues[0] += deltaX;
                command.originalValues[1] += deltaY;
            } else {
                // Absolute command
                command.originalValues[0] = newX;
                command.originalValues[1] = newY;
            }
            
            command.startHandlePoint = [newX, newY];
        }
    }

    adjustEndHandlePoint(commandIndex: string | number, newX: number, newY: number): void {
        const index = typeof commandIndex === 'string' ? parseInt(commandIndex) : commandIndex;
        const command = this.parsedCommands[index];
        
        if (command && command.endHandlePoint) {
            if (command.commandLetter.toLowerCase() === command.commandLetter) {
                // Relative command
                const deltaX = newX - command.endHandlePoint[0];
                const deltaY = newY - command.endHandlePoint[1];
                command.originalValues[2] += deltaX;
                command.originalValues[3] += deltaY;
            } else {
                // Absolute command
                command.originalValues[2] = newX;
                command.originalValues[3] = newY;
            }
            
            command.endHandlePoint = [newX, newY];
        }
    }
}
