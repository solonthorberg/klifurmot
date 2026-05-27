export default function DisplayAthleteName({ Name }: { Name: string }) {
    return (
        <>
            {Name.split(' ')
                .map((word, i) =>
                    i === 0
                        ? word.charAt(0).toUpperCase() +
                          word.slice(1).toLowerCase()
                        : word.toUpperCase(),
                )
                .join(' ')}
        </>
    );
}
