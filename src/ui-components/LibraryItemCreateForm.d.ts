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
export declare type LibraryItemCreateFormInputValues = {
    title?: string;
    compatibleClasses?: string[];
    region?: string;
    standards?: string[];
    version?: string;
    description?: string;
};
export declare type LibraryItemCreateFormValidationValues = {
    title?: ValidationFunction<string>;
    compatibleClasses?: ValidationFunction<string>;
    region?: ValidationFunction<string>;
    standards?: ValidationFunction<string>;
    version?: ValidationFunction<string>;
    description?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type LibraryItemCreateFormOverridesProps = {
    LibraryItemCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    title?: PrimitiveOverrideProps<TextFieldProps>;
    compatibleClasses?: PrimitiveOverrideProps<TextFieldProps>;
    region?: PrimitiveOverrideProps<TextFieldProps>;
    standards?: PrimitiveOverrideProps<TextFieldProps>;
    version?: PrimitiveOverrideProps<TextFieldProps>;
    description?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type LibraryItemCreateFormProps = React.PropsWithChildren<{
    overrides?: LibraryItemCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: LibraryItemCreateFormInputValues) => LibraryItemCreateFormInputValues;
    onSuccess?: (fields: LibraryItemCreateFormInputValues) => void;
    onError?: (fields: LibraryItemCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: LibraryItemCreateFormInputValues) => LibraryItemCreateFormInputValues;
    onValidate?: LibraryItemCreateFormValidationValues;
} & React.CSSProperties>;
export default function LibraryItemCreateForm(props: LibraryItemCreateFormProps): React.ReactElement;
