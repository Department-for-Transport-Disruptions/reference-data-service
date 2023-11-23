import { z } from "zod";

export const snsMessageAttributeSchema = z.record(
    z.object({
        Type: z.string(),
        Value: z.string(),
    }),
);

export const snsMessageSchema = z.object({
    SignatureVersion: z.string(),
    Timestamp: z.string(),
    Signature: z.string(),
    SigningCertURL: z.string(),
    MessageId: z.string(),
    Message: z.string(),
    Type: z.string(),
    TopicArn: z.string(),
    MessageAttributes: snsMessageAttributeSchema.optional(),
    Subject: z.string().optional(),
    Token: z.string().optional(),
    UnsubscribeURL: z.string().optional(),
    SubscribeURL: z.string().optional(),
});

export type SnsMessage = z.infer<typeof snsMessageSchema>;

export const baseMessageSchema = z.object({
    event_type: z.string(),
    event_time: z.string().datetime(),
    event_reference: z.number(),
    object_type: z.string(),
});

export type BaseMessage = z.infer<typeof baseMessageSchema>;

export const permitMessageSchema = baseMessageSchema
    .and(
        z.object({
            object_data: z.object({
                permit_reference_number: z.string(),
                highway_authority: z.string(),
                highway_authority_swa_code: z.coerce.number(),
                works_location_coordinates: z.string().optional(),
                street_name: z.string().optional(),
                area_name: z.string().optional(),
                work_category: z.string().optional(),
                traffic_management_type: z.string().optional(),
                proposed_start_date: z.string().datetime().optional(),
                proposed_end_date: z.string().datetime().optional(),
                actual_start_date: z.string().datetime().optional(),
                actual_end_date: z.string().datetime().optional(),
                work_status: z.string().optional(),
                usrn: z.string().optional(),
                activity_type: z.string().optional(),
                works_location_type: z.string().optional(),
                is_traffic_sensitive: z.string().optional(),
                permit_status: z.string().optional(),
                town: z.string().optional(),
                current_traffic_management_type: z.string().optional(),
                current_traffic_manage_type_update_date: z.string().datetime().optional(),
            }),
        }),
    )
    .transform((data) => ({
        permitReferenceNumber: data.object_data.permit_reference_number,
        highwayAuthority: data.object_data.highway_authority,
        highwayAuthoritySwaCode: data.object_data.highway_authority_swa_code,
        worksLocationCoordinates: data.object_data.works_location_coordinates ?? null,
        streetName: data.object_data.street_name ?? null,
        areaName: data.object_data.area_name ?? null,
        workCategory: data.object_data.work_category ?? null,
        trafficManagementType: data.object_data.traffic_management_type ?? null,
        proposedStartDateTime: data.object_data.proposed_start_date ?? null,
        proposedEndDateTime: data.object_data.proposed_end_date ?? null,
        actualStartDateTime: data.object_data.actual_start_date ?? null,
        actualEndDateTime: data.object_data.actual_end_date ?? null,
        workStatus: data.object_data.work_status ?? null,
        usrn: data.object_data.usrn ?? null,
        activityType: data.object_data.activity_type ?? null,
        worksLocationType: data.object_data.works_location_type ?? null,
        isTrafficSensitive: data.object_data.is_traffic_sensitive ?? null,
        permitStatus: data.object_data.permit_status ?? null,
        town: data.object_data.town ?? null,
        currentTrafficManagementType: data.object_data.current_traffic_management_type ?? null,
        currentTrafficManagementTypeUpdateDate: data.object_data.current_traffic_manage_type_update_date ?? null,
        lastUpdatedDateTime: data.event_time ?? null,
    }));

export type PermitMessage = z.infer<typeof permitMessageSchema>;

export const roadworkSchema = z.object({
    permitReferenceNumber: z.string(),
    highwayAuthority: z.string(),
    highwayAuthoritySwaCode: z.coerce.number(),
    worksLocationCoordinates: z.string().nullable(),
    streetName: z.string().nullable(),
    areaName: z.string().nullable(),
    workCategory: z.string().nullable(),
    trafficManagementType: z.string().nullable(),
    proposedStartDateTime: z.string().datetime().nullable(),
    proposedEndDateTime: z.string().datetime().nullable(),
    actualStartDateTime: z.string().datetime().nullable(),
    actualEndDateTime: z.string().datetime().nullable(),
    workStatus: z.string().nullable(),
    usrn: z.string().nullable(),
    activityType: z.string().nullable(),
    worksLocationType: z.string().nullable(),
    isTrafficSensitive: z.string().nullable(),
    permitStatus: z.string().nullable(),
    town: z.string().nullable(),
    currentTrafficManagementType: z.string().nullable(),
    currentTrafficManagementTypeUpdateDate: z.string().datetime().nullable(),
    lastUpdatedDateTime: z.string().datetime(),
    createdDateTime: z.string().datetime().optional(),
});

export type Roadwork = z.infer<typeof roadworkSchema>;
