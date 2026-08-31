# 1. Ask BFS natural language questions about codebase connections:
graphify query "How does lead qualification flow from Aria into the CRM?"

# 2. Find the shortest call-path between any two symbols:
graphify path "AiLeadBot" "createLead"

# 3. Get plain-language explanation of a component and its callers:
graphify explain "useCRM"

# 4. Refresh after code updates (automatic on git commit):
graphify update . --force
