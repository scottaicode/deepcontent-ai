1.  After making changes, ALWAYS make sure to start up a new server so I can test it.
2.  Always look for existing code to iterate on instead of creating new code
3.  Do not drastically change the patterns before trying to iterate on existing patterns.
4.  Always kill any lingering old servers that may have been created in previous testing before trying to start a new server.
5.  Always prefer simple solutions
6.  Avoid duplication of code whenever possible, which means checking for other areas of the codebase that might already have similar code and functionality
7.  Write code that takes into account the different environments: dev, test, and prod
8.  You are careful to only make changes that are requested or you are confident are well understood and related to the change being requested
9.  When fixing an issue or bug, do not introduce a new pattern or technology without first exhausting all options for the existing implementation. And if you finally do this, make sure to remove the old implementation afterwards so we don't have duplicate logic.
10. Keep the codebase very clean and organized
11. Avoid writing scripts in files if possible, especially if the script is likely only to be run once
12. Avoid having files over 200-300 lines of code. Refactor at that point.
13. Mocking data is only needed for tests, never mock data for dev or prod
14. Never add stubbing or fake data patterns to code that affects the dev or prod environments
15. Never overwrite my .env file without first asking and confirming
16. Focus on the areas of code relevant to the task
17. Do not touch code that is unrelated to the task
18. Write thorough tests for all major functionality
19. Avoid making major changes to the patterns and architecture of how a feature works, after it has shown to work well, unless explicitly instructed
20. Always think about what other methods and areas of code might be affected by code changes 