from typing import List, Dict, Any
from app.llm import orchestrator

def sanitize_ticket(t: Dict[str, Any], index: int) -> Dict[str, Any]:
    title = str(t.get("title", f"Task {index + 1}")).strip()
    description = str(t.get("description", "No description provided.")).strip()
    
    # acceptanceCriteria
    ac = t.get("acceptanceCriteria", [])
    if isinstance(ac, str):
        ac = [line.strip("- *").strip() for line in ac.split("\n") if line.strip()]
    elif not isinstance(ac, list):
        ac = ["Verify implementation meets specifications", "Pass automated tests"]
        
    # technicalNotes
    tech_notes = str(t.get("technicalNotes", "Follow project coding guidelines and standard patterns.")).strip()
    
    # dependencies
    deps = t.get("dependencies", [])
    if isinstance(deps, str):
        deps = [d.strip() for d in deps.split(",") if d.strip()]
    elif not isinstance(deps, list):
        deps = []
        
    # priority
    prio = str(t.get("priority", "MEDIUM")).upper()
    if prio not in ["HIGH", "MEDIUM", "LOW"]:
        prio = "MEDIUM"
        
    # storyPoints
    sp = t.get("storyPoints", 3)
    try:
        sp = int(sp)
        if sp <= 0:
            sp = 3
    except Exception:
        sp = 3
        
    # labels
    labels = t.get("labels", [])
    if isinstance(labels, str):
        labels = [l.strip() for l in labels.split(",") if l.strip()]
    elif not isinstance(labels, list):
        labels = ["feature"]
        
    # prChecklist
    pr = t.get("prChecklist", [])
    if isinstance(pr, str):
        pr = [line.strip("- *").strip() for line in pr.split("\n") if line.strip()]
    elif not isinstance(pr, list) or len(pr) == 0:
        pr = [
            "Code compiles without warnings or TypeScript errors",
            "Unit/integration tests written and passing",
            "No sensitive credentials or hardcoded keys committed",
            "PR description documents changes and testing verification"
        ]
        
    return {
        "title": title,
        "description": description,
        "acceptanceCriteria": ac,
        "technicalNotes": tech_notes,
        "dependencies": deps,
        "priority": prio,
        "storyPoints": sp,
        "labels": labels,
        "prChecklist": pr
    }

def generate_project_tickets(
    project_name: str,
    description: str,
    prd_text: str,
    tech_stack: str,
    goals: str = "",
    constraints: str = ""
) -> Dict[str, Any]:
    raw_tickets, provider = orchestrator.generate_tickets(
        project_name=project_name,
        description=description,
        prd_text=prd_text,
        tech_stack=tech_stack,
        goals=goals,
        constraints=constraints
    )

    sanitized = [sanitize_ticket(t, i) for i, t in enumerate(raw_tickets)]
    
    return {
        "success": True,
        "provider": provider,
        "ticketsCount": len(sanitized),
        "tickets": sanitized
    }
