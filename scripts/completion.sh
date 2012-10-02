# bash completion for shortline

_short()
{
  local cur command subcommand commands options environs

  COMPREPLY=()

  cur="${COMP_WORDS[$COMP_CWORD]}"
  prev=${COMP_WORDS[COMP_CWORD-1]}
  command=${COMP_WORDS[1]}
  subcommand=${COMP_WORDS[2]}
  environs='production test'

  commands='start stop add update ls status remove test help'
  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=( $( compgen -W "$commands" -- $cur ) )
  else
    case $command in
      add)
        if [[ $COMP_CWORD -eq 2 ]]; then
          options='receiver'
        fi
        if [[ $COMP_CWORD -gt 4 ]]; then
          if [[ "$prev" != -* ]]; then
            options='-i -c -p -m'
          fi
          if [[ "$prev" == "-m" ]]; then
            options=$environs
          fi
        fi
        ;;
      update)
        if [[ $COMP_CWORD -eq 2 ]]; then
          options='receiver'
        fi
        if [[ $COMP_CWORD -gt 3 ]]; then
          if [[ "$prev" != -* ]]; then
            options='-n -h -i -c -p -m'
          fi
          if [[ "$prev" == "-m" ]]; then
            options=$environs
          fi
        fi
        ;;
      ls|status)
        if [[ "$prev" != -* ]]; then
          options='-r -m'
        fi
        if [[ "$prev" == "-m" ]]; then
          options=$environs
        fi
        ;;
      remove)
        if [[ $COMP_CWORD -eq 2 ]]; then
          options='receiver all'
        else
          if [[ "$subcommand" == "all" ]]; then
            if [[ "$prev" != -* ]]; then
              options='-m'
            fi
            if [[ "$prev" == "-m" ]]; then
              options=$environs
            fi
          fi
          if [[ "$subcommand" == "receiver" ]]; then
            if [[ $COMP_CWORD -gt 3 ]]; then
              if [[ "$prev" != -* ]]; then
                options='-m'
              fi
              if [[ "$prev" == "-m" ]]; then
                options=$environs
              fi
            fi
          fi
        fi
        ;;
      start)
        if [[ "$prev" == "-m" ]]; then
          options=$environs
        fi
        if [[ $COMP_CWORD -eq 2 ]]; then
          options='-m'
        fi
        ;;
    esac
    COMPREPLY=( $( compgen -W "$options" -- $cur ) )
  fi
}
complete -F _short short
