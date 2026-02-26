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
export declare type SmartHomeDesignUpdateFormInputValues = {
    smartHomeId?: string;
    version?: number;
    lastModified?: string;
    lockedBy?: string;
    lockedAt?: string;
    ontologyVersion?: string;
};
export declare type SmartHomeDesignUpdateFormValidationValues = {
    smartHomeId?: ValidationFunction<string>;
    version?: ValidationFunction<number>;
    lastModified?: ValidationFunction<string>;
    lockedBy?: ValidationFunction<string>;
    lockedAt?: ValidationFunction<string>;
    ontologyVersion?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type SmartHomeDesignUpdateFormOverridesProps = {
    SmartHomeDesignUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    smartHomeId?: PrimitiveOverrideProps<TextFieldProps>;
    version?: PrimitiveOverrideProps<TextFieldProps>;
    lastModified?: PrimitiveOverrideProps<TextFieldProps>;
    lockedBy?: PrimitiveOverrideProps<TextFieldProps>;
    lockedAt?: PrimitiveOverrideProps<TextFieldProps>;
    ontologyVersion?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type SmartHomeDesignUpdateFormProps = React.PropsWithChildren<{
    overrides?: SmartHomeDesignUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    smartHomeDesign?: any;
    onSubmit?: (fields: SmartHomeDesignUpdateFormInputValues) => SmartHomeDesignUpdateFormInputValues;
    onSuccess?: (fields: SmartHomeDesignUpdateFormInputValues) => void;
    onError?: (fields: SmartHomeDesignUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: SmartHomeDesignUpdateFormInputValues) => SmartHomeDesignUpdateFormInputValues;
    onValidate?: SmartHomeDesignUpdateFormValidationValues;
} & React.CSSProperties>;
export default function SmartHomeDesignUpdateForm(props: SmartHomeDesignUpdateFormProps): React.ReactElement;
