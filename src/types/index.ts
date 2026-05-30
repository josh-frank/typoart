// Redux types
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';

// Custom hooks with proper typing
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Common types used across components
export interface MouseEventData {
    x: number;
    y: number;
    target: EventTarget & { dataset: { [key: string]: string } };
}

export interface ClientDimensions {
    width: number;
    height: number;
}

// Component prop types
export interface ShapeProps {
    descriptor: string;
}

export interface HandleProps {
    parsedCommand: {
        index: number;
        commandLetter: string;
        originalValues: number[];
        absoluteValues: number[];
        endPoint: [number, number];
        startPoint: [number, number];
        startHandlePoint?: [number, number];
        endHandlePoint?: [number, number];
    };
}

export interface Transformation {
    translate: [number, number];
    scale: [number, number];
    rotate: number;
}

// Re-export types from other modules for convenience
export type { RootState, AppDispatch } from '../redux/store';
export type { ArtboardState } from '../redux/artboardSlice';
export type { ShapesState } from '../redux/shapesSlice';
export type { EditMode } from '../redux/modeSlice';
