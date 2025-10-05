#!/bin/bash

# Replace with your actual Supabase values
SUPABASE_URL="https://javwknwcdjfrcsuglytu.supabase.co/functions/v1/CANDIDATE_FINALIZE_URL"
SUPABASE_KEY="<SUPABASE_ANON_OR_SERVICE_ROLE_KEY>"

# List of candidate UUIDs
candidates=(
"e2a0d3a8-459c-4078-a6db-c59cc11b5c07"
"834d4dec-dc58-4ad6-9f09-e63c122c6728"
"8f9bc090-1f0b-4db0-906a-faf737e176e9"
"6b86a6d9-1124-424e-a4d4-6327bc342531"
"299787e3-369c-4cd2-84ba-a6e2877fc330"
"bf31bdb7-aefe-44e1-92b4-3bfb552eca25"
"a97115c2-651e-4bc3-ac37-c1d40e80a8bd"
"20f3e474-1120-42a4-a7eb-e7449fece56d"
"06d23444-a24a-4ab7-893c-bd3f70411458"
"33f7f3b7-09b3-428f-bbcc-75b4081a7713"
"3a4b1434-7ded-490b-ba3b-35c45a7a061c"
"68c305e3-d6ae-4815-9c34-2e22166f7045"
"4bf468dc-8348-44ac-9518-a5bb3bb29477"
"d596e289-b2da-4982-80ae-31d7f14b82b7"
"b98713de-d1b1-401e-9fa0-f98e3f8d0ea1"
"16dab77d-1639-469c-876d-30641e5712ce"
"345caab1-f030-4489-890c-ba79bf3b0f85"
"fab76d3d-feb1-46df-9548-50a8c4a81db6"
"b12eb602-d284-48af-8f5d-4dd51c237a81"
"248415e2-0239-4dc8-86a1-115a8040ca68"
"8cc44eda-58ce-4602-be30-d0da8b8b6c3e"
"cf9037e9-6583-44e1-88a1-4cd3c0b06256"
"1e226f6b-5b74-452a-af47-889bf80275e2"
"1e77a0fc-d1b8-42a5-9d78-f35413ae77e0"
"378f71e0-5ac3-4211-830b-bf0a7314b107"
"a9ca36e9-3c99-4e16-a8e6-e67651415e0d"
"4c78ab28-11ca-4f94-a12a-eced5f65bdea"
"a654f9a9-ae00-4b17-8687-2de37461e12d"
"30d5732f-2704-4289-84f0-d304dc65a29b"
"d47c74f3-c55e-4002-9cda-aaa1104389f7"
"b804b86a-a15b-4f8c-b83a-3038a9622ef1"
"353db12d-dc58-46d8-b46c-38cff389c31a"
"f40bffa7-1d62-41dc-a88d-b5fc5aa1b169"
"d58999ab-1acf-463f-be52-3e0fb8512ea5"
"7abdeb09-3cc4-4e95-9334-915d0b8a272e"
"0c8821c2-f192-4bdf-8ee2-c5cc7b5349a9"
"1c7c0220-9f36-41e1-99ef-ffb0f770c20f"
"1ac278bb-b86b-4acc-a740-3b78e77e0fdd"
"5317e6ba-4907-4c3a-97fd-f07a3c827dfe"
"f283ef6c-2dd3-4b67-986e-e459148d7e5f"
"15292e16-9d88-4d68-bfc8-239bd1ebb848"
"abccdd57-3587-46a6-8524-77e4f131481f"
"39860f64-d47e-4111-bbb9-7d051de68f75"
"8cbe0df5-401a-426f-b672-d647f5a32259"
"c3d37e23-697d-45ee-8a43-64b710d0c6be"
"24596232-24c3-48ac-95e0-ef88dfebda90"
"8aa1a6b6-40f3-47d6-9cc8-4918bac7c629"
"3d8e71d1-39a1-47d7-abef-83b4a646dceb"
"1cb05548-902c-4ed3-b5f7-5cebc645905f"
"bb6e0781-3972-4bfc-9df7-e0d6c2782bac"
"0761dd60-8585-4801-a7f2-4ae17cfadf3c"
"88948bdd-3ef9-43ce-b2bf-931ff6d1196b"
"82fcb14b-1c7e-4f84-8230-6ced47945a2e"
"8ce7b05b-6164-4176-8c7d-fbb273f08436"
"1b7b3d8a-1682-416b-918a-743e2cd4aa95"
"fc1d6177-dedd-41d7-9429-e7d3d3596124"
"db5d2311-7e26-4fac-8d6b-942e0ee8b55d"
"42d33143-afae-410d-926e-301a848133df"
"1995acc7-78b9-48aa-b328-6e8bfa00c690"
"f169d60d-e811-47c9-ae4b-01baa3afc57e"
"7dea5607-c8ac-40e9-a97a-9fb6eba0b95a"
"7b0502e4-d39b-4837-b689-5f3caa9322fd"
"5a38866a-6170-43b6-bd84-3439ad065738"
"2cfafdc7-4462-435c-a628-0e05db9f6b30"
)

# Loop through and call edge function
for uuid in "${candidates[@]}"; do
  echo "Running attributes-finalize for candidate $uuid"
  curl -s -X POST "$SUPABASE_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -d "{
      \"candidate_uuid\": \"$uuid\",
      \"record\": {
        \"candidate_uuid\": \"$uuid\",
        \"company_ids\": [],
        \"completed_companies\": []
      }
    }"
  echo -e "\n---"
done
