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
export declare type SmartHomeDesignCreateFormInputValues = {
    smartHomeId?: string;
    version?: number;
    lastModified?: string;
    lockedBy?: string;
    lockedAt?: string;
    ontologyVersion?: string;
};
export declare type SmartHomeDesignCreateFormValidationValues = {
    smartHomeId?: ValidationFunction<string>;
    version?: ValidationFunction<number>;
    lastModified?: ValidationFunction<string>;
    lockedBy?: ValidationFunction<string>;
    lockedAt?: ValidationFunction<string>;
    ontologyVersion?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type SmartHomeDesignCreateFormOverridesProps = {
    SmartHomeDesignCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    smartHomeId?: PrimitiveOverrideProps<TextFieldProps>;
    version?: PrimitiveOverrideProps<TextFieldProps>;
    lastModified?: PrimitiveOverrideProps<TextFieldProps>;
    lockedBy?: PrimitiveOverrideProps<TextFieldProps>;
    lockedAt?: PrimitiveOverrideProps<TextFieldProps>;
    ontologyVersion?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type SmartHomeDesignCreateFormProps = React.PropsWithChildren<{
    overrides?: SmartHomeDesignCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: SmartHomeDesignCreateFormInputValues) => SmartHomeDesignCreateFormInputValues;
    onSuccess?: (fields: SmartHomeDesignCreateFormInputValues) => void;
    onError?: (fields: SmartHomeDesignCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: SmartHomeDesignCreateFormInputValues) => SmartHomeDesignCreateFormInputValues;
    onValidate?: SmartHomeDesignCreateFormValidationValues;
} & React.CSSProperties>;
export default function SmartHomeDesignCreateForm(props: SmartHomeDesignCreateFormProps): React.ReactElement;
