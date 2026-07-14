/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import { Button, Flex, Grid, TextField } from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { getSmartHomeDesign } from "../graphql/queries";
import { updateSmartHomeDesign } from "../graphql/mutations";
const client = generateClient();
export default function SmartHomeDesignUpdateForm(props) {
  const {
    id: idProp,
    smartHomeDesign: smartHomeDesignModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    smartHomeId: "",
    version: "",
    lastModified: "",
    lockedBy: "",
    lockedAt: "",
    ontologyVersion: "",
  };
  const [smartHomeId, setSmartHomeId] = React.useState(
    initialValues.smartHomeId
  );
  const [version, setVersion] = React.useState(initialValues.version);
  const [lastModified, setLastModified] = React.useState(
    initialValues.lastModified
  );
  const [lockedBy, setLockedBy] = React.useState(initialValues.lockedBy);
  const [lockedAt, setLockedAt] = React.useState(initialValues.lockedAt);
  const [ontologyVersion, setOntologyVersion] = React.useState(
    initialValues.ontologyVersion
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = smartHomeDesignRecord
      ? { ...initialValues, ...smartHomeDesignRecord }
      : initialValues;
    setSmartHomeId(cleanValues.smartHomeId);
    setVersion(cleanValues.version);
    setLastModified(cleanValues.lastModified);
    setLockedBy(cleanValues.lockedBy);
    setLockedAt(cleanValues.lockedAt);
    setOntologyVersion(cleanValues.ontologyVersion);
    setErrors({});
  };
  const [smartHomeDesignRecord, setSmartHomeDesignRecord] = React.useState(
    smartHomeDesignModelProp
  );
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await client.graphql({
              query: getSmartHomeDesign.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getSmartHomeDesign
        : smartHomeDesignModelProp;
      setSmartHomeDesignRecord(record);
    };
    queryData();
  }, [idProp, smartHomeDesignModelProp]);
  React.useEffect(resetStateValues, [smartHomeDesignRecord]);
  const validations = {
    smartHomeId: [{ type: "Required" }],
    version: [{ type: "Required" }],
    lastModified: [{ type: "Required" }],
    lockedBy: [],
    lockedAt: [],
    ontologyVersion: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  const convertToLocal = (date) => {
    const df = new Intl.DateTimeFormat("default", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      calendar: "iso8601",
      numberingSystem: "latn",
      hourCycle: "h23",
    });
    const parts = df.formatToParts(date).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          smartHomeId,
          version,
          lastModified,
          lockedBy: lockedBy ?? null,
          lockedAt: lockedAt ?? null,
          ontologyVersion: ontologyVersion ?? null,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await client.graphql({
            query: updateSmartHomeDesign.replaceAll("__typename", ""),
            variables: {
              input: {
                id: smartHomeDesignRecord.id,
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "SmartHomeDesignUpdateForm")}
      {...rest}
    >
      <TextField
        label="Smart home id"
        isRequired={true}
        isReadOnly={false}
        value={smartHomeId}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              smartHomeId: value,
              version,
              lastModified,
              lockedBy,
              lockedAt,
              ontologyVersion,
            };
            const result = onChange(modelFields);
            value = result?.smartHomeId ?? value;
          }
          if (errors.smartHomeId?.hasError) {
            runValidationTasks("smartHomeId", value);
          }
          setSmartHomeId(value);
        }}
        onBlur={() => runValidationTasks("smartHomeId", smartHomeId)}
        errorMessage={errors.smartHomeId?.errorMessage}
        hasError={errors.smartHomeId?.hasError}
        {...getOverrideProps(overrides, "smartHomeId")}
      ></TextField>
      <TextField
        label="Version"
        isRequired={true}
        isReadOnly={false}
        type="number"
        step="any"
        value={version}
        onChange={(e) => {
          let value = isNaN(parseInt(e.target.value))
            ? e.target.value
            : parseInt(e.target.value);
          if (onChange) {
            const modelFields = {
              smartHomeId,
              version: value,
              lastModified,
              lockedBy,
              lockedAt,
              ontologyVersion,
            };
            const result = onChange(modelFields);
            value = result?.version ?? value;
          }
          if (errors.version?.hasError) {
            runValidationTasks("version", value);
          }
          setVersion(value);
        }}
        onBlur={() => runValidationTasks("version", version)}
        errorMessage={errors.version?.errorMessage}
        hasError={errors.version?.hasError}
        {...getOverrideProps(overrides, "version")}
      ></TextField>
      <TextField
        label="Last modified"
        isRequired={true}
        isReadOnly={false}
        type="datetime-local"
        value={lastModified && convertToLocal(new Date(lastModified))}
        onChange={(e) => {
          let value =
            e.target.value === "" ? "" : new Date(e.target.value).toISOString();
          if (onChange) {
            const modelFields = {
              smartHomeId,
              version,
              lastModified: value,
              lockedBy,
              lockedAt,
              ontologyVersion,
            };
            const result = onChange(modelFields);
            value = result?.lastModified ?? value;
          }
          if (errors.lastModified?.hasError) {
            runValidationTasks("lastModified", value);
          }
          setLastModified(value);
        }}
        onBlur={() => runValidationTasks("lastModified", lastModified)}
        errorMessage={errors.lastModified?.errorMessage}
        hasError={errors.lastModified?.hasError}
        {...getOverrideProps(overrides, "lastModified")}
      ></TextField>
      <TextField
        label="Locked by"
        isRequired={false}
        isReadOnly={false}
        value={lockedBy}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              smartHomeId,
              version,
              lastModified,
              lockedBy: value,
              lockedAt,
              ontologyVersion,
            };
            const result = onChange(modelFields);
            value = result?.lockedBy ?? value;
          }
          if (errors.lockedBy?.hasError) {
            runValidationTasks("lockedBy", value);
          }
          setLockedBy(value);
        }}
        onBlur={() => runValidationTasks("lockedBy", lockedBy)}
        errorMessage={errors.lockedBy?.errorMessage}
        hasError={errors.lockedBy?.hasError}
        {...getOverrideProps(overrides, "lockedBy")}
      ></TextField>
      <TextField
        label="Locked at"
        isRequired={false}
        isReadOnly={false}
        type="datetime-local"
        value={lockedAt && convertToLocal(new Date(lockedAt))}
        onChange={(e) => {
          let value =
            e.target.value === "" ? "" : new Date(e.target.value).toISOString();
          if (onChange) {
            const modelFields = {
              smartHomeId,
              version,
              lastModified,
              lockedBy,
              lockedAt: value,
              ontologyVersion,
            };
            const result = onChange(modelFields);
            value = result?.lockedAt ?? value;
          }
          if (errors.lockedAt?.hasError) {
            runValidationTasks("lockedAt", value);
          }
          setLockedAt(value);
        }}
        onBlur={() => runValidationTasks("lockedAt", lockedAt)}
        errorMessage={errors.lockedAt?.errorMessage}
        hasError={errors.lockedAt?.hasError}
        {...getOverrideProps(overrides, "lockedAt")}
      ></TextField>
      <TextField
        label="Ontology version"
        isRequired={false}
        isReadOnly={false}
        value={ontologyVersion}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              smartHomeId,
              version,
              lastModified,
              lockedBy,
              lockedAt,
              ontologyVersion: value,
            };
            const result = onChange(modelFields);
            value = result?.ontologyVersion ?? value;
          }
          if (errors.ontologyVersion?.hasError) {
            runValidationTasks("ontologyVersion", value);
          }
          setOntologyVersion(value);
        }}
        onBlur={() => runValidationTasks("ontologyVersion", ontologyVersion)}
        errorMessage={errors.ontologyVersion?.errorMessage}
        hasError={errors.ontologyVersion?.hasError}
        {...getOverrideProps(overrides, "ontologyVersion")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || smartHomeDesignModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || smartHomeDesignModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
