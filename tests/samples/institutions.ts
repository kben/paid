
import kostentreagerJson from "../../dist/kostentraeger.min.json";
import { deserializeInstitutionLists } from "../../src/kostentraeger/json_serializer";

export const institutionLists = deserializeInstitutionLists(JSON.stringify(kostentreagerJson));
