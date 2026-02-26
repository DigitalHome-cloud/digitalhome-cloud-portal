/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type SmartHomeUpdateFormInputValues = {
    owners?: string[];
    country?: string;
    zip?: string;
    streetCode?: string;
    houseNumber?: string;
    suffix?: string;
    address?: string;
    description?: string;
    ownerName?: string;
};
export declare type SmartHomeUpdateFormValidationValues = {
    owners?: ValidationFunction<string>;
    country?: ValidationFunction<string>;
    zip?: ValidationFunction<string>;
    streetCode?: ValidationFunction<string>;
    houseNumber?: ValidationFunction<string>;
    suffix?: ValidationFunction<string>;
    address?: ValidationFunction<string>;
    description?: ValidationFunction<string>;
    ownerName?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type SmartHomeUpdateFormOverridesProps = {
    SmartHomeUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    owners?: PrimitiveOverrideProps<TextFieldProps>;
    country?: PrimitiveOverrideProps<TextFieldProps>;
    zip?: PrimitiveOverrideProps<TextFieldProps>;
    streetCode?: PrimitiveOverrideProps<TextFieldProps>;
    houseNumber?: PrimitiveOverrideProps<TextFieldProps>;
    suffix?: PrimitiveOverrideProps<TextFieldProps>;
    address?: PrimitiveOverrideProps<TextFieldProps>;
    description?: PrimitiveOverrideProps<TextFieldProps>;
    ownerName?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type SmartHomeUpdateFormProps = React.PropsWithChildren<{
    overrides?: SmartHomeUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    smartHome?: any;
    onSubmit?: (fields: SmartHomeUpdateFormInputValues) => SmartHomeUpdateFormInputValues;
    onSuccess?: (fields: SmartHomeUpdateFormInputValues) => void;
    onError?: (fields: SmartHomeUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: SmartHomeUpdateFormInputValues) => SmartHomeUpdateFormInputValues;
    onValidate?: SmartHomeUpdateFormValidationValues;
} & React.CSSProperties>;
export default function SmartHomeUpdateForm(props: SmartHomeUpdateFormProps): React.ReactElement;
