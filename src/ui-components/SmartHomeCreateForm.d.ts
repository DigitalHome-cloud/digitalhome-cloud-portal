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
export declare type SmartHomeCreateFormInputValues = {
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
export declare type SmartHomeCreateFormValidationValues = {
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
export declare type SmartHomeCreateFormOverridesProps = {
    SmartHomeCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
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
export declare type SmartHomeCreateFormProps = React.PropsWithChildren<{
    overrides?: SmartHomeCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: SmartHomeCreateFormInputValues) => SmartHomeCreateFormInputValues;
    onSuccess?: (fields: SmartHomeCreateFormInputValues) => void;
    onError?: (fields: SmartHomeCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: SmartHomeCreateFormInputValues) => SmartHomeCreateFormInputValues;
    onValidate?: SmartHomeCreateFormValidationValues;
} & React.CSSProperties>;
export default function SmartHomeCreateForm(props: SmartHomeCreateFormProps): React.ReactElement;
