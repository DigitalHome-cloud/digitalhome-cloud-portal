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
export declare type LibraryItemUpdateFormInputValues = {
    title?: string;
    compatibleClasses?: string[];
    region?: string;
    standards?: string[];
    version?: string;
    description?: string;
};
export declare type LibraryItemUpdateFormValidationValues = {
    title?: ValidationFunction<string>;
    compatibleClasses?: ValidationFunction<string>;
    region?: ValidationFunction<string>;
    standards?: ValidationFunction<string>;
    version?: ValidationFunction<string>;
    description?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type LibraryItemUpdateFormOverridesProps = {
    LibraryItemUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    title?: PrimitiveOverrideProps<TextFieldProps>;
    compatibleClasses?: PrimitiveOverrideProps<TextFieldProps>;
    region?: PrimitiveOverrideProps<TextFieldProps>;
    standards?: PrimitiveOverrideProps<TextFieldProps>;
    version?: PrimitiveOverrideProps<TextFieldProps>;
    description?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type LibraryItemUpdateFormProps = React.PropsWithChildren<{
    overrides?: LibraryItemUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    libraryItem?: any;
    onSubmit?: (fields: LibraryItemUpdateFormInputValues) => LibraryItemUpdateFormInputValues;
    onSuccess?: (fields: LibraryItemUpdateFormInputValues) => void;
    onError?: (fields: LibraryItemUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: LibraryItemUpdateFormInputValues) => LibraryItemUpdateFormInputValues;
    onValidate?: LibraryItemUpdateFormValidationValues;
} & React.CSSProperties>;
export default function LibraryItemUpdateForm(props: LibraryItemUpdateFormProps): React.ReactElement;
