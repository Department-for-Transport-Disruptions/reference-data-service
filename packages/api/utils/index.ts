import { getAreaOfPolygon } from "geolib";
import { z } from "zod";
import { ServiceStops, ServiceTracks } from "../client";
import { ClientError } from "../error";

export const notEmpty = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const formatPolygon = (polygonToFormat: [number, number][]): string => {
    return polygonToFormat.map((coordinate) => `${coordinate[0]} ${coordinate[1]}`).toString();
};

export const getPolygon = (polygon: string, maxArea: number): string => {
    let parsedPolygon: [number, number][];

    try {
        parsedPolygon = z
            .array(z.tuple([z.number(), z.number()]))
            .min(4)
            .parse(JSON.parse(polygon))
            .map((point) => [point[0], point[1]]);
    } catch (_e) {
        throw new ClientError("Invalid polygon provided");
    }

    const polygonArea = getAreaOfPolygon(parsedPolygon);

    if (polygonArea / 1000000 > maxArea) {
        throw new ClientError(`Area of polygon must be below ${maxArea}km2`);
    }

    return `POLYGON((${formatPolygon(parsedPolygon)}))`;
};

export const isServiceStops = (stops: ServiceStops | ServiceTracks): stops is ServiceStops =>
    !!(stops as ServiceStops)[0]?.dataSource;
