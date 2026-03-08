# Bead Workflow

Projects define the active areas of work that the repository is tracking right now. Each project should have lightweight notes describing the intended outcome so planning and execution stay attached to a concrete goal.

The planner reads project context and generates small beads that describe one bounded slice of work. Those beads are intended to be fresh, local, and actionable rather than long-lived backlog items.

Workers consume beads from the open queue, execute one bounded task, record evidence, and then close or hand off the bead based on the outcome. Beads should generally be sized to take about 5 to 30 minutes.

Open beads expire after 24 hours. If a bead goes stale, it should be refreshed, rewritten, or replaced instead of silently lingering in the queue.
