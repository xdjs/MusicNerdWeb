[1mdiff --git a/src/app/profile/Dashboard.tsx b/src/app/profile/Dashboard.tsx[m
[1mindex b669ea3..a728e0e 100644[m
[1m--- a/src/app/profile/Dashboard.tsx[m
[1m+++ b/src/app/profile/Dashboard.tsx[m
[36m@@ -730,27 +730,7 @@[m [mfunction UgcStats({ user, showLeaderboard = true, allowEditUsername = false, sho[m
                 </div>[m
             ) : ([m
                 <>[m
[31m-                    {/* Username row displayed above the three columns on all breakpoints */}[m
[31m-					<div className="relative pb-4 w-full md:max-w-4xl md:mx-auto">[m
[31m-						{!isEditingUsername && ([m
[31m-                            <div className="flex items-center justify-center gap-3 w-full">[m
[31m-								{/* Avatar left of username using ENS/Jazzicon logic */}[m
[31m-								<div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center hover:animate-[slow-spin_10s_linear_infinite]">[m
[31m-									{ensLoading ? ([m
[31m-										<img className="w-4 h-4" src="/spinner.svg" alt="Loading..." />[m
[31m-									) : ensAvatarUrl && !avatarError ? ([m
[31m-										<img src={ensAvatarUrl} alt="ENS Avatar" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />[m
[31m-									) : jazziconSeed ? ([m
[31m-										<Jazzicon diameter={32} seed={jazziconSeed} />[m
[31m-									) : ([m
[31m-										<img src="/default_pfp_pink.png" alt="Default Profile" className="w-full h-full object-cover" />[m
[31m-									)}[m
[31m-								</div>[m
[31m-								<p className="text-lg font-semibold leading-none">[m
[31m-									{displayName}[m
[31m-								</p>[m
[31m-							</div>[m
[31m-						)}[m
[32m+[m[32m                    {/* Username row removed - moved to align with Role column */}[m
                         {/* Mobile Edit button under username */}[m
                         {allowEditUsername && !isGuestUser && ([m
                             <div className="md:hidden pt-6 flex justify-center">[m
[36m@@ -817,6 +797,27 @@[m [mfunction UgcStats({ user, showLeaderboard = true, allowEditUsername = false, sho[m
                             <div className="space-y-4">[m
                                 {/* Admin user search removed */}[m
 [m
[32m+[m[32m                                {/* Profile picture and username aligned with Role */}[m
[32m+[m[32m                                {!isEditingUsername && ([m
[32m+[m[32m                                    <div className="flex items-center gap-3 w-full justify-center md:justify-start mb-4">[m
[32m+[m[32m                                        {/* Avatar using ENS/Jazzicon logic */}[m
[32m+[m[32m                                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center hover:animate-[slow-spin_10s_linear_infinite]">[m
[32m+[m[32m                                            {ensLoading ? ([m
[32m+[m[32m                                                <img className="w-4 h-4" src="/spinner.svg" alt="Loading..." />[m
[32m+[m[32m                                            ) : ensAvatarUrl && !avatarError ? ([m
[32m+[m[32m                                                <img src={ensAvatarUrl} alt="ENS Avatar" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />[m
[32m+[m[32m                                            ) : jazziconSeed ? ([m
[32m+[m[32m                                                <Jazzicon diameter={32} seed={jazziconSeed} />[m
[32m+[m[32m                                            ) : ([m
[32m+[m[32m                                                <img src="/default_pfp_pink.png" alt="Default Profile" className="w-full h-full object-cover" />[m
[32m+[m[32m                                            )}[m
[32m+[m[32m                                        </div>[m
[32m+[m[32m                                        <p className="text-lg font-semibold leading-none">[m
[32m+[m[32m                                            {displayName}[m
[32m+[m[32m                                        </p>[m
[32m+[m[32m                                    </div>[m
[32m+[m[32m                                )}[m
[32m+[m
                                 {/* Role heading aligned with other column headings */}[m
                                 {showStatus && ([m
                                     <div className="flex items-center gap-2 text-lg w-full justify-center md:justify-start">[m
[36m@@ -980,4 +981,6 @@[m [mfunction UgcStats({ user, showLeaderboard = true, allowEditUsername = false, sho[m
             )}[m
         </section>[m
     )[m
[32m+[m[32m}[m
[32m+[m[32m}[m
 }[m
\ No newline at end of file[m
